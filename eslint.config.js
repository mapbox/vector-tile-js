import config from 'eslint-config-mourner';

export default [
	...config,
	{
		rules: {
			'no-case-declarations': 0
		}
	}
];
