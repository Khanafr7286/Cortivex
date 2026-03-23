import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
} from 'n8n-workflow';

export class CortivexInsights implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Cortivex Insights',
		name: 'cortivexInsights',
		icon: 'file:cortivex.svg',
		group: ['transform'],
		version: 1,
		subtitle: 'Get learning insights',
		description: 'Retrieve learned patterns and insights from Cortivex pipelines',
		defaults: {
			name: 'Cortivex Insights',
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
				displayName: 'Pipeline Filter',
				name: 'pipeline',
				type: 'string',
				default: '',
				placeholder: 'e.g. code-review',
				description: 'Optional pipeline name to filter insights (leave empty for all)',
			},
			{
				displayName: 'Minimum Confidence',
				name: 'minConfidence',
				type: 'number',
				default: 0,
				typeOptions: {
					minValue: 0,
					maxValue: 1,
					numberPrecision: 2,
				},
				description: 'Minimum confidence score to include (0.0 - 1.0)',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				typeOptions: {
					minValue: 1,
					maxValue: 500,
				},
				description: 'Maximum number of insights to return',
			},
			{
				displayName: 'Sort By',
				name: 'sortBy',
				type: 'options',
				default: 'confidence',
				options: [
					{
						name: 'Confidence (Highest First)',
						value: 'confidence',
					},
					{
						name: 'Recency (Newest First)',
						value: 'recency',
					},
					{
						name: 'Usage Count',
						value: 'usage',
					},
				],
				description: 'How to sort the returned insights',
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
				const minConfidence = this.getNodeParameter('minConfidence', i) as number;
				const limit = this.getNodeParameter('limit', i) as number;
				const sortBy = this.getNodeParameter('sortBy', i) as string;

				const headers: Record<string, string> = {};
				if (apiKey) {
					headers['Authorization'] = `Bearer ${apiKey}`;
				}

				const queryParams: Record<string, string | number> = {
					limit,
					sortBy,
				};

				if (pipeline) {
					queryParams['pipeline'] = pipeline;
				}

				if (minConfidence > 0) {
					queryParams['minConfidence'] = minConfidence;
				}

				const insightsResponse = await this.helpers.httpRequest({
					method: 'GET',
					url: `${baseUrl}/api/insights`,
					headers,
					qs: queryParams,
					json: true,
				});

				const insights = Array.isArray(insightsResponse.insights)
					? insightsResponse.insights
					: Array.isArray(insightsResponse)
						? insightsResponse
						: [];

				if (insights.length === 0) {
					returnData.push({
						json: {
							insights: [],
							count: 0,
							pipeline: pipeline || 'all',
						},
						pairedItem: { item: i },
					});
				} else {
					// Return each insight as a separate item for downstream processing
					for (const insight of insights) {
						returnData.push({
							json: {
								pattern: insight.pattern ?? null,
								confidence: insight.confidence ?? null,
								pipeline: insight.pipeline ?? pipeline || null,
								usageCount: insight.usageCount ?? 0,
								lastUsed: insight.lastUsed ?? null,
								category: insight.category ?? null,
								description: insight.description ?? null,
								metadata: insight.metadata ?? {},
							},
							pairedItem: { item: i },
						});
					}
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
				throw new NodeApiError(this.getNode(), error as Record<string, unknown>, {
					itemIndex: i,
					message: 'Failed to retrieve Cortivex insights',
				});
			}
		}

		return [returnData];
	}
}
