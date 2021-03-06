import { AccessControlFormData } from 'Portainer/components/accessControlForm/porAccessControlFormModel';
import { ResourceControlViewModel } from 'Portainer/models/resourceControl/resourceControl';

class EditCustomTemplateViewController {
  /* @ngInject */
  constructor($async, $state, Authentication, CustomTemplateService, FormValidator, Notifications, ResourceControlService) {
    Object.assign(this, { $async, $state, Authentication, CustomTemplateService, FormValidator, Notifications, ResourceControlService });

    this.formValues = null;
    this.state = {
      formValidationError: '',
    };

    this.getTemplate = this.getTemplate.bind(this);
    this.getTemplateAsync = this.getTemplateAsync.bind(this);
    this.submitAction = this.submitAction.bind(this);
    this.submitActionAsync = this.submitActionAsync.bind(this);
    this.editorUpdate = this.editorUpdate.bind(this);
  }

  getTemplate() {
    return this.$async(this.getTemplateAsync);
  }
  async getTemplateAsync() {
    try {
      const [template, file] = await Promise.all([
        this.CustomTemplateService.customTemplate(this.$state.params.id),
        this.CustomTemplateService.customTemplateFile(this.$state.params.id),
      ]);
      template.FileContent = file;
      this.formValues = template;
      this.formValues.ResourceControl = new ResourceControlViewModel(template.ResourceControl);
      this.formValues.AccessControlData = new AccessControlFormData();
    } catch (err) {
      this.Notifications.error('Failure', err, 'Unable to retrieve custom template data');
    }
  }

  validateForm() {
    this.state.formValidationError = '';

    if (!this.formValues.FileContent) {
      this.state.formValidationError = 'Template file content must not be empty';
      return false;
    }

    const isAdmin = this.Authentication.isAdmin();
    const accessControlData = this.formValues.AccessControlData;
    const error = this.FormValidator.validateAccessControl(accessControlData, isAdmin);

    if (error) {
      this.state.formValidationError = error;
      return false;
    }

    return true;
  }

  submitAction() {
    return this.$async(this.submitActionAsync);
  }
  async submitActionAsync() {
    if (!this.validateForm()) {
      return;
    }

    this.actionInProgress = true;
    try {
      await this.CustomTemplateService.updateCustomTemplate(this.formValues.Id, this.formValues);

      const userDetails = this.Authentication.getUserDetails();
      const userId = userDetails.ID;
      await this.ResourceControlService.applyResourceControl(userId, this.formValues.AccessControlData, this.formValues.ResourceControl);

      this.Notifications.success('Custom template successfully updated');
      this.$state.go('docker.templates.custom');
    } catch (err) {
      this.Notifications.error('Failure', err, 'Unable to update custom template');
    } finally {
      this.actionInProgress = false;
    }
  }

  editorUpdate(cm) {
    this.formValues.fileContent = cm.getValue();
  }

  $onInit() {
    this.getTemplate();
  }
}

export default EditCustomTemplateViewController;
