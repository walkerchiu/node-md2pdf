/**
 * Password Protection Settings Module
 * Handles PDF password protection and permissions configuration
 */

import chalk from 'chalk';

import { BaseCustomizationFeature, CustomizationDependencies } from './types';

/**
 * Password protection permissions interface
 */
interface PasswordPermissions {
  printing?: boolean;
  modifying?: boolean;
  copying?: boolean;
  annotating?: boolean;
  fillingForms?: boolean;
  contentAccessibility?: boolean;
  documentAssembly?: boolean;
}

/**
 * Password protection settings interface
 */
interface PasswordProtectionSettings {
  enabled: boolean;
  userPassword?: string;
  ownerPassword?: string;
  permissions?: PasswordPermissions;
}

/**
 * Password Protection Settings Feature
 */
export class PasswordProtectionFeature extends BaseCustomizationFeature {
  constructor(deps: CustomizationDependencies) {
    super(deps);
  }

  /**
   * Start password protection settings flow
   */
  async start(): Promise<void> {
    while (true) {
      console.clear();

      // Display header information block
      const title = this.translationManager.t('security.header.title');
      const subtitle = this.translationManager.t('security.header.subtitle');
      const borderLine = '─'.repeat(79);

      console.log(chalk.blue(borderLine));
      console.log(
        chalk.blue(title.padStart((79 + title.length) / 2).padEnd(79)),
      );
      console.log(chalk.blue(borderLine));
      console.log(
        chalk.blue(subtitle.padStart((79 + subtitle.length) / 2).padEnd(79)),
      );
      console.log(chalk.blue(borderLine));
      console.log();

      const option = await this.selectOption();

      switch (option) {
        case 'preview':
          await this.previewSettings();
          break;
        case 'toggle-protection':
          await this.toggleProtection();
          break;
        case 'set-user-password':
          await this.setUserPassword();
          break;
        case 'set-owner-password':
          await this.setOwnerPassword();
          break;
        case 'configure-permissions':
          await this.configurePermissions();
          break;
        case 'reset-defaults':
          await this.resetDefaults();
          break;
        case 'back':
          return;
        default:
          console.log(
            chalk.red(
              this.translationManager.t('security.messages.invalidChoice'),
            ),
          );
          await this.pressAnyKey();
      }
    }
  }

  /**
   * Select password protection option
   */
  private async selectOption(): Promise<string> {
    const inquirer = await import('inquirer');
    const { option } = await inquirer.default.prompt([
      {
        type: 'list',
        name: 'option',
        message: this.translationManager.t('security.prompts.selectOption'),
        choices: [
          {
            name:
              '0. ' + this.translationManager.t('common.menu.returnToPrevious'),
            value: 'back',
            short: this.translationManager.t('common.actions.back'),
          },
          {
            name:
              '1. ' +
              this.translationManager.t('security.menu.previewSettings'),
            value: 'preview',
          },
          {
            name:
              '2. ' +
              this.translationManager.t('security.menu.toggleProtection'),
            value: 'toggle-protection',
          },
          {
            name:
              '3. ' +
              this.translationManager.t('security.menu.setUserPassword'),
            value: 'set-user-password',
          },
          {
            name:
              '4. ' +
              this.translationManager.t('security.menu.setOwnerPassword'),
            value: 'set-owner-password',
          },
          {
            name:
              '5. ' +
              this.translationManager.t('security.menu.configurePermissions'),
            value: 'configure-permissions',
          },
          {
            name:
              '6. ' + this.translationManager.t('security.menu.resetDefaults'),
            value: 'reset-defaults',
          },
        ],
        pageSize: 10,
      },
    ]);

    return option;
  }

  /**
   * Display security sub-feature header information block (simple style)
   */
  private displaySubHeader(
    subFeature:
      | 'preview'
      | 'userPassword'
      | 'ownerPassword'
      | 'toggleProtection'
      | 'configurePermissions'
      | 'resetDefaults',
  ): void {
    const title = this.translationManager.t(
      `security.subHeaders.${subFeature}.title`,
    );
    const subtitle = this.translationManager.t(
      `security.subHeaders.${subFeature}.subtitle`,
    );

    // Format matching other sub-features
    let emoji = '';
    switch (subFeature) {
      case 'preview':
        emoji = '👁️  ';
        break;
      case 'userPassword':
        emoji = '🔐 ';
        break;
      case 'ownerPassword':
        emoji = '🔑 ';
        break;
      case 'toggleProtection':
        emoji = '⚡ ';
        break;
      case 'configurePermissions':
        emoji = '⚙️  ';
        break;
      case 'resetDefaults':
        emoji = '🔄 ';
        break;
    }

    console.log();
    console.log(chalk.cyan.bold(emoji + title));
    console.log();
    console.log(chalk.gray(subtitle));
    console.log(chalk.gray('─'.repeat(60)));
    console.log();
  }

  /**
   * Preview current password protection settings
   */
  private async previewSettings(): Promise<void> {
    console.clear();

    // Display sub-feature header
    this.displaySubHeader('preview');

    const currentSettings = this.configManager.get('passwordProtection', {
      enabled: false,
    }) as PasswordProtectionSettings;

    // Check if password protection has valid passwords
    const hasUserPassword =
      currentSettings.userPassword &&
      currentSettings.userPassword.trim().length > 0;
    const hasOwnerPassword =
      currentSettings.ownerPassword &&
      currentSettings.ownerPassword.trim().length > 0;

    // Debug: show actual configuration values (only in debug mode)
    const logLevel = this.configManager.get('logging.level', 'info') as string;
    const isDebugMode = logLevel.toLowerCase() === 'debug';
    if (isDebugMode) {
      console.log(
        chalk.gray(
          `DEBUG: enabled=${currentSettings.enabled}, userPwd=${!!currentSettings.userPassword}, ownerPwd=${!!currentSettings.ownerPassword}`,
        ),
      );
      console.log(
        chalk.gray(
          `DEBUG: ConfigManager path=${this.configManager.getConfigPath()}`,
        ),
      );
      console.log(
        chalk.gray(`DEBUG: Current working directory=${process.cwd()}`),
      );
      console.log();
    }

    console.log(
      chalk.yellow(
        `${this.translationManager.t('security.messages.passwordProtection')}:`,
      ),
    );
    console.log(
      `  ${this.translationManager.t('security.messages.status')}: ${
        currentSettings.enabled
          ? chalk.green(
              `✅ ${this.translationManager.t('security.status.enabled')}`,
            )
          : chalk.red(
              `❌ ${this.translationManager.t('security.status.disabled')}`,
            )
      }`,
    );

    // Always show password status for better user understanding
    console.log(
      `  ${this.translationManager.t('security.menu.setUserPassword')}: ${
        hasUserPassword
          ? chalk.green(this.translationManager.t('security.status.set'))
          : chalk.gray(this.translationManager.t('security.status.notSet'))
      }`,
    );
    console.log(
      `  ${this.translationManager.t('security.menu.setOwnerPassword')}: ${
        hasOwnerPassword
          ? chalk.green(this.translationManager.t('security.status.set'))
          : chalk.gray(this.translationManager.t('security.status.notSet'))
      }`,
    );

    // Show warning if settings are inconsistent
    if (currentSettings.enabled && !hasUserPassword && !hasOwnerPassword) {
      console.log(
        `\n${chalk.yellow(this.translationManager.t('security.warnings.protectionEnabledNoPasswords'))}`,
      );
    } else if (
      !currentSettings.enabled &&
      (hasUserPassword || hasOwnerPassword)
    ) {
      console.log(
        `\n${chalk.yellow(this.translationManager.t('security.warnings.passwordsSetButDisabled'))}`,
      );
    }

    if (currentSettings.enabled || hasUserPassword || hasOwnerPassword) {
      // Display permissions if enabled or passwords exist
      console.log(
        `\n  ${chalk.yellow(`${this.translationManager.t('security.messages.pdfPermissions')}:`)}`,
      );
      const permissions = currentSettings.permissions || {
        printing: true,
        modifying: false, // Use standard defaults
        copying: true,
        annotating: true,
        fillingForms: true,
        contentAccessibility: true,
        documentAssembly: false,
      };

      const permissionItems = [
        {
          key: 'printing',
          label: this.translationManager.t('security.permissions.printing'),
        },
        {
          key: 'modifying',
          label: this.translationManager.t('security.permissions.modifying'),
        },
        {
          key: 'copying',
          label: this.translationManager.t('security.permissions.copying'),
        },
        {
          key: 'annotating',
          label: this.translationManager.t('security.permissions.annotating'),
        },
        {
          key: 'fillingForms',
          label: this.translationManager.t('security.permissions.fillingForms'),
        },
        {
          key: 'contentAccessibility',
          label: this.translationManager.t(
            'security.permissions.contentAccessibility',
          ),
        },
        {
          key: 'documentAssembly',
          label: this.translationManager.t(
            'security.permissions.documentAssembly',
          ),
        },
      ];

      permissionItems.forEach((item) => {
        const isAllowed = permissions[item.key as keyof typeof permissions];
        console.log(
          `    ${item.label}: ${
            isAllowed
              ? chalk.green(
                  `✅ ${this.translationManager.t('security.status.allowed')}`,
                )
              : chalk.red(
                  `❌ ${this.translationManager.t('security.status.denied')}`,
                )
          }`,
        );
      });
    }

    console.log();
    await this.pressAnyKey();
  }

  /**
   * Toggle password protection on/off
   */
  private async toggleProtection(): Promise<void> {
    console.clear();

    // Display sub-feature header
    this.displaySubHeader('toggleProtection');

    const currentSettings = this.configManager.get('passwordProtection', {
      enabled: false,
    }) as PasswordProtectionSettings;

    // Simple toggle based on enabled flag
    const newEnabled = !currentSettings.enabled;

    if (newEnabled) {
      // Preserve all existing settings when enabling
      this.configManager.set('passwordProtection', {
        ...currentSettings,
        enabled: true,
        // Ensure we have default permissions if none exist
        permissions: currentSettings.permissions || {
          printing: true,
          modifying: false,
          copying: true,
          annotating: true,
          fillingForms: true,
          contentAccessibility: true,
          documentAssembly: false,
        },
      });
      await this.configManager.save();
      console.log(
        chalk.green(
          `✅ ${this.translationManager.t('security.messages.protectionEnabled')}`,
        ),
      );
    } else {
      const inquirer = await import('inquirer');
      const result = await inquirer.default.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: this.translationManager.t(
            'security.messages.confirmDisable',
          ),
          default: false,
        },
      ]);

      if (result.confirm) {
        // Only change enabled status, preserve other settings
        this.configManager.set('passwordProtection', {
          ...currentSettings,
          enabled: false,
        });
        await this.configManager.save();
        console.log(
          chalk.green(
            `✅ ${this.translationManager.t('security.messages.protectionDisabled')}`,
          ),
        );
      }
      // Don't return early, let user see the result regardless of choice
    }

    await this.pressAnyKey();
  }

  /**
   * Set user password (required to open document)
   */
  private async setUserPassword(): Promise<void> {
    console.clear();

    // Display sub-feature header
    this.displaySubHeader('userPassword');

    const inquirer = await import('inquirer');
    const result = await inquirer.default.prompt([
      {
        type: 'password',
        name: 'password',
        message: this.translationManager.t('security.inputs.userPassword'),
        mask: '*',
      },
    ]);

    const currentSettings = this.configManager.get('passwordProtection', {
      enabled: false,
    }) as PasswordProtectionSettings;

    // Only enable protection if password is not empty
    if (result.password && result.password.trim().length > 0) {
      this.configManager.set('passwordProtection', {
        ...currentSettings,
        enabled: true,
        userPassword: result.password,
      });
    } else {
      // Remove user password but keep other settings
      const updatedSettings = { ...currentSettings };
      delete updatedSettings.userPassword;

      // Only disable if no other passwords are set
      const hasOwnerPassword =
        updatedSettings.ownerPassword &&
        updatedSettings.ownerPassword.trim().length > 0;
      if (!hasOwnerPassword) {
        updatedSettings.enabled = false;
      }

      this.configManager.set('passwordProtection', updatedSettings);
    }

    await this.configManager.save();

    if (result.password) {
      console.log(
        chalk.green(
          `\n✅ ${this.translationManager.t('security.messages.userPasswordSet')}`,
        ),
      );
    } else {
      console.log(
        chalk.yellow(
          `\n⚠️  ${this.translationManager.t('security.messages.userPasswordRemoved')}`,
        ),
      );
    }
    await this.pressAnyKey();
  }

  /**
   * Set owner password (required for administrative access)
   */
  private async setOwnerPassword(): Promise<void> {
    console.clear();

    // Display sub-feature header
    this.displaySubHeader('ownerPassword');

    const inquirer = await import('inquirer');
    const result = await inquirer.default.prompt([
      {
        type: 'password',
        name: 'password',
        message: this.translationManager.t('security.inputs.ownerPassword'),
        mask: '*',
      },
    ]);

    const currentSettings = this.configManager.get('passwordProtection', {
      enabled: false,
    }) as PasswordProtectionSettings;

    // Only enable protection if password is not empty
    if (result.password && result.password.trim().length > 0) {
      this.configManager.set('passwordProtection', {
        ...currentSettings,
        enabled: true,
        ownerPassword: result.password,
      });
    } else {
      // Remove owner password but keep other settings
      const updatedSettings = { ...currentSettings };
      delete updatedSettings.ownerPassword;

      // Only disable if no other passwords are set
      const hasUserPassword =
        updatedSettings.userPassword &&
        updatedSettings.userPassword.trim().length > 0;
      if (!hasUserPassword) {
        updatedSettings.enabled = false;
      }

      this.configManager.set('passwordProtection', updatedSettings);
    }

    await this.configManager.save();

    if (result.password) {
      console.log(
        chalk.green(
          `\n✅ ${this.translationManager.t('security.messages.ownerPasswordSet')}`,
        ),
      );
    } else {
      console.log(
        chalk.yellow(
          `\n⚠️  ${this.translationManager.t('security.messages.ownerPasswordRemoved')}`,
        ),
      );
    }
    await this.pressAnyKey();
  }

  /**
   * Reset password protection to defaults
   */
  private async resetDefaults(): Promise<void> {
    console.clear();

    // Display sub-feature header
    this.displaySubHeader('resetDefaults');

    const inquirer = await import('inquirer');
    const result = await inquirer.default.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: this.translationManager.t('security.messages.confirmReset'),
        default: false,
      },
    ]);

    if (result.confirm) {
      this.configManager.set('passwordProtection', { enabled: false });
      await this.configManager.save();

      console.log(
        chalk.green(
          `\n✅ ${this.translationManager.t('security.messages.resetComplete')}`,
        ),
      );
    }

    await this.pressAnyKey();
  }

  /**
   * Configure PDF permissions
   */
  private async configurePermissions(): Promise<void> {
    const currentSettings = this.configManager.get('passwordProtection', {
      enabled: false,
    }) as PasswordProtectionSettings;

    const defaultPermissions = this.getPresetPermissions('standard');
    let workingPermissions = currentSettings.permissions
      ? { ...currentSettings.permissions }
      : { ...defaultPermissions };

    const permissionKeys = [
      'printing',
      'modifying',
      'copying',
      'annotating',
      'fillingForms',
      'contentAccessibility',
      'documentAssembly',
    ] as const;

    // Add preset options with independent numbering
    const presetOptions = [
      {
        name: `1. ${this.translationManager.t('security.presets.strict')}`,
        value: 'preset:strict',
      },
      {
        name: `2. ${this.translationManager.t('security.presets.standard')}`,
        value: 'preset:standard',
      },
      {
        name: `3. ${this.translationManager.t('security.presets.permissive')}`,
        value: 'preset:permissive',
      },
    ];

    while (true) {
      console.clear();

      // Display sub-feature header (moved into loop)
      this.displaySubHeader('configurePermissions');

      // Display current permissions status
      console.log(
        chalk.yellow(
          this.translationManager.t('security.messages.currentPermissions'),
        ),
      );
      permissionKeys.forEach((key, index) => {
        const status = workingPermissions[key]
          ? chalk.green(this.translationManager.t('security.status.enabled'))
          : chalk.red(this.translationManager.t('security.status.disabled'));
        console.log(
          `  ${index + 1}. ${this.translationManager.t(`security.permissions.${key}`)} - ${status}`,
        );
      });

      // Add spacing between current settings and menu
      console.log();

      // Build menu choices
      const inquirer = await import('inquirer');
      const choices = [
        // Preset options
        ...presetOptions,
        new inquirer.default.Separator(),
        // Individual permission toggles with independent numbering
        ...permissionKeys.map((key, index) => ({
          name: `${index + 1}. ${this.translationManager.t(`security.permissions.${key}`)} [${workingPermissions[key] ? chalk.green('✓') : chalk.red('✗')}]`,
          value: key,
        })),
        new inquirer.default.Separator(),
        {
          name: `${chalk.cyan(`1. ${this.translationManager.t('security.messages.savePermissions')}`)}`,
          value: 'save',
        },
        {
          name: `${chalk.gray(`2. ${this.translationManager.t('security.messages.cancelPermissions')}`)}`,
          value: 'cancel',
        },
      ];

      const result = await inquirer.default.prompt([
        {
          type: 'list',
          name: 'action',
          message: this.translationManager.t(
            'security.messages.togglePermission',
          ),
          choices: choices,
          pageSize: 15,
        },
      ]);

      if (result.action === 'save') {
        await this.savePermissions(workingPermissions);
        break;
      } else if (result.action === 'cancel') {
        break;
      } else if (result.action.startsWith('preset:')) {
        // Apply preset
        const preset = result.action.replace('preset:', '');
        workingPermissions = { ...this.getPresetPermissions(preset) };
      } else if (permissionKeys.includes(result.action as any)) {
        // Toggle the permission
        workingPermissions[result.action as keyof typeof workingPermissions] =
          !workingPermissions[result.action as keyof typeof workingPermissions];
      }
    }
  }

  /**
   * Get preset permissions configuration
   */
  private getPresetPermissions(preset: string): Required<PasswordPermissions> {
    switch (preset) {
      case 'strict':
        return {
          printing: false,
          modifying: false,
          copying: false,
          annotating: false,
          fillingForms: false,
          contentAccessibility: true, // Always allow accessibility
          documentAssembly: false,
        };
      case 'standard':
        return {
          printing: true,
          modifying: false,
          copying: true,
          annotating: true,
          fillingForms: true,
          contentAccessibility: true,
          documentAssembly: false,
        };
      case 'permissive':
        return {
          printing: true,
          modifying: true,
          copying: true,
          annotating: true,
          fillingForms: true,
          contentAccessibility: true,
          documentAssembly: true,
        };
      default:
        return this.getPresetPermissions('standard');
    }
  }

  /**
   * Save permissions to configuration
   */
  private async savePermissions(
    permissions: PasswordPermissions,
  ): Promise<void> {
    const currentSettings = this.configManager.get('passwordProtection', {
      enabled: false,
    });

    this.configManager.set('passwordProtection', {
      ...currentSettings,
      enabled: true, // Enable protection if configuring permissions
      permissions,
    });

    await this.configManager.save();

    console.log(
      chalk.green(
        `\n✅ ${this.translationManager.t('security.messages.permissionsUpdated')}`,
      ),
    );
    await this.pressAnyKey();
  }
}
