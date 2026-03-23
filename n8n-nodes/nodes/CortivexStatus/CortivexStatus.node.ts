import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
} from 'n8n-workflow';

export class CortivexStatus implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Cortivex Status',
		name: 'cortivexStatus',
		icon: 'file:cortivex.svg',
		group: ['transform'],
		version: 1,
		subtitle: 'Check pipeline status',
		description: 'Check the status of a running Cortivex pipeline',
		defaults: {
			name: 'Cortivex Status',
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
				displayName: 'Run ID',
				name: 'runId',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'e.g. run_abc123',
				description: 'The run ID returned from a Cortivex Run node',
			},
			{
				displayName: 'Include Node Details',
				name: 'includeNodeDetails',
				type: 'boolean',
				default: true,
				description: 'Whether to include per-node progress details in the response',
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
				const runId = this.getNodeParameter('runId', i) as string;
				const includeNodeDetails = this.getNodeParameter('includeNodeDetails', i) as boolean;

				const headers: Record<string, string> = {};
				if (apiKey) {
					headers['Authorization'] = `Bearer ${apiKey}`;
				}

				const queryParams: Record<string, string> = {};
				if (includeNodeDetails) {
					queryParams['includeNodes'] = 'true';
				}

				const statusResponse = await this.helpers.httpRequest({
					method: 'GET',
					url: `${baseUrl}/api/pipeline/status/${runId}`,
					headers,
					qs: queryParams,
					json: true,
				});

				returnData.push({
					json: {
						runId,
						status: statusResponse.status ?? 'unknown',
						pipeline: statusResponse.pipeline ?? null,
						progress: statusResponse.progress ?? null,
						nodeProgress: statusResponse.nodeProgress ?? [],
						cost: statusResponse.cost ?? null,
						duration: statusResponse.duration ?? null,
						startedAt: statusResponse.startedAt ?? null,
						updatedAt: statusResponse.updatedAt ?? null,
						error: statusResponse.error ?? null,
					},
					pairedItem: { item: i },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: (error as Error).message,
						},
						pairedItem: { item: i },
					});
					continue;
				}
				throw new NodeApiError(this.getNode(), error as Record<string, unknown>, {
					itemIndex: i,
					message: `Failed to get status for pipeline run`,
				});
			}
		}

		return [returnData];
	}
}
