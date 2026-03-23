import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
} from 'n8n-workflow';

export class CortivexMesh implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Cortivex Mesh',
		name: 'cortivexMesh',
		icon: 'file:cortivex.svg',
		group: ['transform'],
		version: 1,
		subtitle: 'Query mesh state',
		description: 'Query the Cortivex agent mesh for active agents, file ownership, and conflicts',
		defaults: {
			name: 'Cortivex Mesh',
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
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				default: 'getState',
				options: [
					{
						name: 'Get Full State',
						value: 'getState',
						description: 'Get the complete mesh state including agents, ownership, and conflicts',
						action: 'Get full mesh state',
					},
					{
						name: 'List Active Agents',
						value: 'listAgents',
						description: 'List all currently active agents in the mesh',
						action: 'List active agents',
					},
					{
						name: 'Get File Ownership',
						value: 'fileOwnership',
						description: 'Get file ownership mapping across agents',
						action: 'Get file ownership map',
					},
					{
						name: 'Get Conflicts',
						value: 'getConflicts',
						description: 'Get current file conflicts between agents',
						action: 'Get active conflicts',
					},
				],
				description: 'Which mesh data to query',
			},
			{
				displayName: 'Agent ID Filter',
				name: 'agentId',
				type: 'string',
				default: '',
				placeholder: 'e.g. agent_abc123',
				displayOptions: {
					show: {
						operation: ['listAgents', 'fileOwnership'],
					},
				},
				description: 'Optional agent ID to filter results',
			},
			{
				displayName: 'File Path Filter',
				name: 'filePath',
				type: 'string',
				default: '',
				placeholder: 'e.g. src/utils/',
				displayOptions: {
					show: {
						operation: ['fileOwnership', 'getConflicts'],
					},
				},
				description: 'Optional file path prefix to filter results',
			},
			{
				displayName: 'Include Resolved',
				name: 'includeResolved',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						operation: ['getConflicts'],
					},
				},
				description: 'Whether to include already-resolved conflicts',
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
				const operation = this.getNodeParameter('operation', i) as string;

				const headers: Record<string, string> = {};
				if (apiKey) {
					headers['Authorization'] = `Bearer ${apiKey}`;
				}

				let responseData: Record<string, unknown>;

				switch (operation) {
					case 'getState': {
						responseData = await this.helpers.httpRequest({
							method: 'GET',
							url: `${baseUrl}/api/mesh/state`,
							headers,
							json: true,
						});

						returnData.push({
							json: {
								operation: 'getState',
								agents: responseData.agents ?? [],
								fileOwnership: responseData.fileOwnership ?? {},
								conflicts: responseData.conflicts ?? [],
								totalAgents: responseData.totalAgents ?? 0,
								activeConflicts: responseData.activeConflicts ?? 0,
								timestamp: new Date().toISOString(),
							},
							pairedItem: { item: i },
						});
						break;
					}

					case 'listAgents': {
						const agentId = this.getNodeParameter('agentId', i) as string;
						const queryParams: Record<string, string> = {};
						if (agentId) {
							queryParams['agentId'] = agentId;
						}

						responseData = await this.helpers.httpRequest({
							method: 'GET',
							url: `${baseUrl}/api/mesh/agents`,
							headers,
							qs: queryParams,
							json: true,
						});

						const agents = Array.isArray(responseData.agents)
							? responseData.agents
							: Array.isArray(responseData)
								? responseData
								: [];

						for (const agent of agents) {
							returnData.push({
								json: {
									operation: 'listAgents',
									agentId: agent.id ?? agent.agentId ?? null,
									name: agent.name ?? null,
									status: agent.status ?? null,
									currentTask: agent.currentTask ?? null,
									filesOwned: agent.filesOwned ?? [],
									startedAt: agent.startedAt ?? null,
									lastActivity: agent.lastActivity ?? null,
								},
								pairedItem: { item: i },
							});
						}

						if (agents.length === 0) {
							returnData.push({
								json: {
									operation: 'listAgents',
									agents: [],
									count: 0,
								},
								pairedItem: { item: i },
							});
						}
						break;
					}

					case 'fileOwnership': {
						const agentId = this.getNodeParameter('agentId', i) as string;
						const filePath = this.getNodeParameter('filePath', i) as string;
						const queryParams: Record<string, string> = {};
						if (agentId) {
							queryParams['agentId'] = agentId;
						}
						if (filePath) {
							queryParams['path'] = filePath;
						}

						responseData = await this.helpers.httpRequest({
							method: 'GET',
							url: `${baseUrl}/api/mesh/ownership`,
							headers,
							qs: queryParams,
							json: true,
						});

						returnData.push({
							json: {
								operation: 'fileOwnership',
								ownership: responseData.ownership ?? responseData,
								totalFiles: responseData.totalFiles ?? 0,
								filter: {
									agentId: agentId || null,
									filePath: filePath || null,
								},
							},
							pairedItem: { item: i },
						});
						break;
					}

					case 'getConflicts': {
						const filePath = this.getNodeParameter('filePath', i) as string;
						const includeResolved = this.getNodeParameter('includeResolved', i) as boolean;
						const queryParams: Record<string, string | boolean> = {};
						if (filePath) {
							queryParams['path'] = filePath;
						}
						if (includeResolved) {
							queryParams['includeResolved'] = 'true';
						}

						responseData = await this.helpers.httpRequest({
							method: 'GET',
							url: `${baseUrl}/api/mesh/conflicts`,
							headers,
							qs: queryParams,
							json: true,
						});

						const conflicts = Array.isArray(responseData.conflicts)
							? responseData.conflicts
							: Array.isArray(responseData)
								? responseData
								: [];

						for (const conflict of conflicts) {
							returnData.push({
								json: {
									operation: 'getConflicts',
									conflictId: conflict.id ?? conflict.conflictId ?? null,
									filePath: conflict.filePath ?? conflict.file ?? null,
									agents: conflict.agents ?? [],
									status: conflict.status ?? null,
									severity: conflict.severity ?? null,
									description: conflict.description ?? null,
									detectedAt: conflict.detectedAt ?? null,
									resolvedAt: conflict.resolvedAt ?? null,
								},
								pairedItem: { item: i },
							});
						}

						if (conflicts.length === 0) {
							returnData.push({
								json: {
									operation: 'getConflicts',
									conflicts: [],
									count: 0,
								},
								pairedItem: { item: i },
							});
						}
						break;
					}

					default:
						throw new NodeApiError(this.getNode(), {} as Record<string, unknown>, {
							message: `Unknown operation: ${operation}`,
						});
				}
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
				if (error instanceof NodeApiError) {
					throw error;
				}
				throw new NodeApiError(this.getNode(), error as Record<string, unknown>, {
					itemIndex: i,
					message: 'Failed to query Cortivex mesh',
				});
			}
		}

		return [returnData];
	}
}
