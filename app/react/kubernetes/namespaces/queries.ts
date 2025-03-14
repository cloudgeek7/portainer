import { useQuery } from 'react-query';

import { EnvironmentId } from '@/react/portainer/environments/types';
import { error as notifyError } from '@/portainer/services/notifications';

import {
  getNamespaces,
  getNamespace,
  getSelfSubjectAccessReview,
} from './service';
import { Namespaces } from './types';

export function useNamespaces(environmentId: EnvironmentId) {
  return useQuery(
    ['environments', environmentId, 'kubernetes', 'namespaces'],
    async () => {
      const namespaces = await getNamespaces(environmentId);
      const namespaceNames = Object.keys(namespaces);
      // use seflsubjectaccess reviews to avoid forbidden requests
      const allNamespaceAccessReviews = await Promise.all(
        namespaceNames.map((namespaceName) =>
          getSelfSubjectAccessReview(environmentId, namespaceName)
        )
      );
      const allowedNamespacesNames = allNamespaceAccessReviews
        .filter((accessReview) => accessReview.status.allowed)
        .map((accessReview) => accessReview.spec.resourceAttributes.namespace);
      const allowedNamespaces = namespaceNames.reduce((acc, namespaceName) => {
        if (allowedNamespacesNames.includes(namespaceName)) {
          acc[namespaceName] = namespaces[namespaceName];
        }
        return acc;
      }, {} as Namespaces);
      return allowedNamespaces;
    },
    {
      onError: (err) => {
        notifyError('Failure', err as Error, 'Unable to get namespaces.');
      },
    }
  );
}

export function useNamespace(environmentId: EnvironmentId, namespace: string) {
  return useQuery(
    ['environments', environmentId, 'kubernetes', 'namespaces', namespace],
    () => getNamespace(environmentId, namespace),
    {
      onError: (err) => {
        notifyError('Failure', err as Error, 'Unable to get namespace.');
      },
    }
  );
}
