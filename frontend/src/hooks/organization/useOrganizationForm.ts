import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { createOrganization } from '@/api/organizations';
import { slugify } from '@/components/organization/organization-ui';

type OrganizationFormOptions = {
  loadOrganization: () => Promise<void>;
  setError: (error: string | null) => void;
  setIsSaving: (isSaving: boolean) => void;
};

export function useOrganizationForm({ loadOrganization, setError, setIsSaving }: OrganizationFormOptions) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);

  const changeOrganizationName = (value: string) => {
    setName(value);
    if (!slugEdited) setSlug(slugify(value));
  };

  const changeOrganizationSlug = (value: string) => {
    setSlugEdited(true);
    setSlug(slugify(value));
  };

  const submitOrganization = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await createOrganization(name.trim(), slug.trim());
      toast.success('Organization created');
      await loadOrganization();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not create organization');
    } finally {
      setIsSaving(false);
    }
  };

  return {
    changeOrganizationName,
    changeOrganizationSlug,
    name,
    slug,
    submitOrganization,
  };
}
