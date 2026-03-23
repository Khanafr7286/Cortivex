import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class CortivexApi implements ICredentialType {
	name = 'cortivexApi';
	displayName = 'Cortivex API';
	documentationUrl = 'https://github.com/cortivex/cortivex';
	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'http://localhost:3939',
			description: 'Cortivex HTTP server URL (e.g. http://localhost:3939)',
			required: true,
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			description: 'Optional API key for authenticated Cortivex instances',
		},
	];
}
