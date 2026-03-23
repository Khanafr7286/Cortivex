import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

export class CortivexRun implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Cortivex Run',
		name: 'cortivexRun',
		icon: 'file:cortivex.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["pipeline"]}}',
		description: 'Run a Cortivex AI agent pipeline',
		defaults: {
			name: 'Cortivex Run',
			color: '#00e5ff',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'cortivexApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Pipeline',
				name: 'pipeline',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'e.g. code-review, refactor, test-gen',
				description: 'Name or template of the Cortivex pipeline to run',
			},
			{
				displayName: 'Configuration Override',
				name: 'config',
				type: 'json',
				default: '{}',
				description: 'Optional JSON configuration to override pipeline defaults',
			},
			{
				displayName: 'Wait for Completion',
				name: 'waitForCompletion',
				type: 'boolean',
				default: true,
				description: 'Whether to wait for the pipeline to complete before returning results',
			},
			{
				displayName: 'Timeout (Seconds)',
				name: 'timeout',
				type: 'number',
				default: 900,
				typeOptions: {
					minValue: 10,
					maxValue: 7200,
				},
				displayOptions: {
					show: {
						waitForCompletion: [true],
					},
				},
				description: 'Maximum number of seconds to wait for pipeline completion',
			},
			{
				displayName: 'Poll Interval (Seconds)',
				name: 'pollInterval',
				type: 'number',
				default: 5,
				typeOptions: {
					minValue: 1,
					maxValue: 60,
				},
				displayOptions: {
					show: {
						waitForCompletion: [true],
					},
				},
				description: 'How often to check pipeline status while waiting',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = await this.getCredentials('cortivexApi');
		const baseUrl = (credentials.baseUrl as string).replace(/\/+$/, '');
		const apiKey = credentials.apiKey as string;

		for (let i = 0; i < items.length; i++) {
			try {
				const pipeline = this.getNodeParameter('pipeline', i) as string;
				const configRaw = this.getNodeParameter('config', i) as string;
				const waitForCompletion = this.getNodeParameter('waitForCompletion', i) as boolean;

				let config: Record<string, unknown> = {};
				if (configRaw && configRaw.trim() !== '{}' && configRaw.trim() !== '') {
					try {
						config = JSON.parse(configRaw);
					} catch {
						throw new NodeOperationError(
							this.getNode(),
							'Invalid JSON in Configuration Override',
							{ itemIndex: i },
						);
					}
				}

				const headers: Record<string, string> = {
					'Content-Type': 'application/json',
				};
				if (apiKey) {
					headers['Authorization'] = `Bearer ${apiKey}`;
				}

				// Start the pipeline run
				const runResponse = await this.helpers.httpRequest({
					method: 'POST',
					url: `${baseUrl}/api/pipeline/run`,
					headers,
					body: {
						pipeline,
						config,
					},
					json: true,
				});

				const runId = runResponse.runId as string;

				if (!runId) {
					throw new NodeApiError(this.getNode(), runResponse as Record<string, unknown>, {
						message: 'No runId returned from Cortivex pipeline start',
						httpCode: '500',
					});
				}

				if (!waitForCompletion) {
					// Return immediately with the run ID
					returnData.push({
						json: {
							runId,
							status: 'started',
							pipeline,
							startedAt: new Date().toISOString(),
						},
					});
					continue;
				}

				// Poll for completion
				const timeout = this.getNodeParameter('timeout', i) as number;
				const pollInterval = this.getNodeParameter('pollInterval', i) as number;
				const startTime = Date.now();
				const timeoutMs = timeout * 1000;

				let statusResponse: Record<string, unknown> = {};
				let completed = false;

				while (Date.now() - startTime < timeoutMs) {
					statusResponse = await this.helpers.httpRequest({
						method: 'GET',
						url: `${baseUrl}/api/pipeline/status/${runId}`,
						headers,
						json: true,
					});

					const status = statusResponse.status as string;

					if (status === 'completed' || status === 'success') {
						completed = true;
						break;
					}

					if (status === 'failed' || status === 'error') {
						throw new NodeApiError(this.getNode(), statusResponse, {
							message: `Pipeline run failed: ${statusResponse.error || 'Unknown error'}`,
							httpCode: '500',
						});
					}

					if (status === 'cancelled') {
						throw new NodeApiError(this.getNode(), statusResponse, {
							message: 'Pipeline run was cancelled',
							httpCode: '499',
						});
					}

					// Wait before polling again
					await new Promise((resolve) => setTimeout(resolve, pollInterval * 1000));
				}

				if (!completed) {
					throw new NodeOperationError(
						this.getNode(),
						`Pipeline run timed out after ${timeout} seconds (runId: ${runId})`,
						{ itemIndex: i },
					);
				}

				returnData.push({
					json: {
						runId,
						pipeline,
						status: 'completed',
						cost: statusResponse.cost ?? null,
						duration: statusResponse.duration ?? null,
						nodeOutcomes: statusResponse.nodeOutcomes ?? [],
						filesModified: statusResponse.filesModified ?? [],
						results: statusResponse.results ?? {},
						completedAt: new Date().toISOString(),
					},
				});
			} catch (error) {
				if (error instanceof NodeApiError || error instanceof NodeOperationError) {
					if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: (error as Error).message,
							},
							pairedItem: { item: i },
						});
						continue;
					}
					throw error;
				}
				throw new NodeApiError(this.getNode(), error as Record<string, unknown>, {
					itemIndex: i,
				});
			}
		}

		return [returnData];
	}
}
