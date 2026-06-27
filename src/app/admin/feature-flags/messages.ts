/**
 * User-facing copy for the feature flags admin UI.
 */

export const featureFlagsMessages = {
	common: {
		enabled: "Enabled",
		disabled: "Disabled",
	},

	modal: {
		titleAdd: "Add feature flag",
		titleEdit: (flagKey: string) => `Edit ${flagKey}`,
		subtitle:
			"Configure rollout state, metadata, validity, and owner targeting.",
		keyLabel: "Key",
		keyLabelRequired: "Key (required)",
		keyPlaceholder: "e.g. limit_order",
		validUntilLabel: "Valid until",
		validUntilLabelRequired: "Valid until (required)",
		keyRequiredError: "Enter a flag key to continue.",
		keyFormatError:
			"Key may only contain letters, numbers, underscore, and hyphen.",
		validUntilRequiredError:
			"Choose a date. This field is required to save the flag.",
		metadataHeading: "Metadata",
		metadataOptionalHint:
			"Version and description are optional — leave blank if you do not need them.",
		versionLabel: "Version (optional)",
		versionPlaceholder: "Leave blank if not used",
		descriptionLabel: "Description (optional)",
		descriptionPlaceholder: "Leave blank if not used",
		ownerIdsHeading: "Allowed account owner IDs (optional)",
		ownerIdsHint:
			"Each ID on its own row. Leave empty or use an empty list to skip owner targeting.",
		cancel: "Cancel",
		savePublishing: "Publishing…",
		saveDeploy: "Save & deploy",
		addToDraft: "Add to table",
		saveLocalChanges: "Save changes",
	},

	admin: {
		loadFailed: "Failed to load",
		saveFailed: "Save failed",
		publishedVersion: (versionNumber: number, environmentLabel: string) =>
			`Published version ${versionNumber} to ${environmentLabel}. Deployment may take a few seconds.`,
		published: (environmentLabel: string) =>
			`Published to ${environmentLabel}.`,
		flagKeyRequired: "Flag key is required.",
		flagKeyInvalid:
			"Flag key may only contain letters, numbers, underscore, and hyphen.",
		flagKeyExists: "A flag with this key is already in the table.",
		deleteModal: {
			kicker: "Remove flag",
			title: "Remove from this draft?",
			body: (key: string) =>
				`The flag “${key}” will be removed from the table. If it still exists on the server, deploy your changes to delete it remotely.`,
			confirm: "Remove",
			cancel: "Cancel",
		},
		loadingConfig: "Loading configuration…",
		pageTitle: "Feature flags",
		pageDescription:
			"Read from AppConfig; publish creates a new hosted version and starts a deployment. Set",
		appConfigEnvVar: "APPCONFIG_DEPLOYMENT_STRATEGY_ID",
		pageDescriptionSuffix: "for writes.",
		entityBadge: (userId: string) => `Entity: ${userId}`,
		flagCount: (n: number) =>
			`${n} ${n === 1 ? "flag" : "flags"}`,
		targetEnvironmentLabel: "Target environment",
		targetEnvironmentHint:
			"Select the environment to load from and publish into.",
		reload: "Reload",
		addFlag: "Add flag",
		createFeatureFlags: "Create feature flags",
		noDeploymentTitle: "No deployment found",
		noDeploymentHint:
			"This environment does not have an AppConfig deployment yet. Create the first feature flag to publish an initial configuration.",
		adminSecretLabel: "Admin secret (optional)",
		adminSecretPlaceholder:
			"If APPCONFIG_ADMIN_SECRET is set on the server",
		rawJsonSummary: "Raw JSON",
		deploy: "Deploy",
		deployDisabledHint: "Edit flags or add new ones to enable deploy.",
		bulkImportOpen: "Bulk import",
		reloadUnsavedConfirm:
			"You have unpublished changes. Reload from the server anyway?",
		unsavedChangesModal: {
			kicker: "Unpublished changes",
			title: "Deploy before continuing?",
			body:
				"You have local changes that have not been published yet. Deploy now to keep them, or continue without deploying to discard them.",
			confirm: "Deploy",
			reloadWithoutDeploy: "Continue without deploy",
			cancel: "Cancel",
		},
	},

	table: {
		headers: [
			"Key",
			"Status",
			"Version",
			"Created",
			"Updated",
			"Valid until",
			"Owner IDs",
			"",
		] as const,
		hostedConfigTitle: "Hosted configuration",
		hostedConfigSubtitle:
			"Changes stay in the table until you deploy. A green dot marks flags that differ from the last loaded version.",
		edit: "Edit",
		delete: "Delete",
		emptyState:
			"No flags yet. Add one or check AppConfig / IAM permissions.",
		missingValue: "—",
		pendingTooltip:
			"This flag has local changes that differ from the last loaded version and have not been deployed yet.",
		ownerIdsPreviewLimit: 3,
		ownerIdsShowMore: (count: number) => `Show ${count} more`,
		ownerIdsShowLess: "Show less",
		ownerIdsCount: (count: number) =>
			`${count} ${count === 1 ? "owner" : "owners"}`,
	},

	ownerIds: {
		rowPlaceholder: "account owner id",
		remove: "Remove",
		emptyHint:
			"No owner IDs added. Leave empty to skip attribute targeting.",
		bulkPlaceholder: "Paste one or many IDs — comma / newline separated",
		add: "Add",
	},

	bulkImport: {
		kicker: "JSON import",
		title: "Bulk add flags",
		subtitle:
			"Paste a JSON object: each property name is a flag key, and its value must match the feature flag shape (enabled boolean, optional metadata, attributes, timestamps). Keys must not already exist in the table.",
		pasteLabel: "Flag object (JSON)",
		placeholder:
			'{\n  "new_rollout": {\n    "enabled": true,\n    "meta_data": { "version": "1", "description": "…" }\n  }\n}',
		addToTable: "Add to table",
		invalidJson: "Invalid JSON — check brackets and quotes.",
		rootMustBeObject: "Root value must be a JSON object (not an array or primitive).",
		emptyObject: "Object has no keys to import.",
		keyAlreadyExists: (key: string) =>
			`"${key}" already exists in the current table.`,
		keyInvalid: (key: string, reason: string) => `"${key}": ${reason}`,
		keyInvalidFormat: (key: string) =>
			`"${key}" is not a valid flag key (use letters, numbers, underscore, hyphen only).`,
	},
	toast: {
		flagAdded: (key: string) =>
			`“${key}” was added to the table. Deploy when you are ready to publish.`,
		flagUpdated: (key: string) =>
			`Changes to “${key}” were saved locally. Deploy to publish.`,
		flagDeleted: (key: string) =>
			`“${key}” was removed from the draft. Deploy to apply the removal remotely.`,
		deployedVersion: (versionNumber: number, environmentLabel: string) =>
			`Published version ${versionNumber} to ${environmentLabel}.`,
		deployed: (environmentLabel: string) =>
			`Published to ${environmentLabel}.`,
	},
} as const;
