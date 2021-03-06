package docker

import (
	"net/http"

	portainer "github.com/portainer/portainer/api"
	"github.com/portainer/portainer/api/http/proxy/factory/responseutils"
)

const (
	taskServiceObjectIdentifier = "ServiceID"
)

// taskListOperation extracts the response as a JSON array, loop through the tasks array
// and filter the containers based on resource controls before rewriting the response.
func (transport *Transport) taskListOperation(response *http.Response, executor *operationExecutor) error {
	// TaskList response is a JSON array
	// https://docs.docker.com/engine/api/v1.28/#operation/TaskList
	responseArray, err := responseutils.GetResponseAsJSONArray(response)
	if err != nil {
		return err
	}

	resourceOperationParameters := &resourceOperationParameters{
		resourceIdentifierAttribute: taskServiceObjectIdentifier,
		resourceType:                portainer.ServiceResourceControl,
		labelsObjectSelector:        selectorTaskLabels,
	}

	responseArray, err = transport.applyAccessControlOnResourceList(resourceOperationParameters, responseArray, executor)
	if err != nil {
		return err
	}

	return responseutils.RewriteResponse(response, responseArray, http.StatusOK)
}

// selectorServiceLabels retrieve the labels object associated to the task object.
// Labels are available under the "Spec.ContainerSpec.Labels" property.
// API schema reference: https://docs.docker.com/engine/api/v1.28/#operation/TaskList
func selectorTaskLabels(responseObject map[string]interface{}) map[string]interface{} {
	taskSpecObject := responseutils.GetJSONObject(responseObject, "Spec")
	if taskSpecObject != nil {
		containerSpecObject := responseutils.GetJSONObject(taskSpecObject, "ContainerSpec")
		if containerSpecObject != nil {
			return responseutils.GetJSONObject(containerSpecObject, "Labels")
		}
	}
	return nil
}
