'use client';

import { useState } from 'react';
import IconButton from '@/app/baseComponents/IconButton/IconButton';
import Dialog from '@/app/baseComponents/Dialog/Dialog';
import DeleteBaseForm from '@/app/baseComponents/BaseForm/DeleteBaseForm';
import { useAlert } from '@/app/state/contexts/AlertContext';
import { deleteProducer } from '@/app/actions/producers';
import type { ProducerGridData } from '@/app/actions/producers';

type Producer = ProducerGridData;

interface DeleteProducerButtonProps {
  producer: Producer;
  onSuccess: () => void;
}

export default function DeleteProducerButton({ producer, onSuccess }: DeleteProducerButtonProps) {
  const { showAlert } = useAlert();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrors([]);

    try {
      const result = await deleteProducer(producer.id);

      if (result.success) {
        showAlert({
          message: 'Producer deleted successfully',
          type: 'success',
          duration: 4000,
        });
        setTimeout(() => {
          setOpen(false);
          onSuccess();
        }, 500);
      } else {
        const errorMessage = result.error || 'Error deleting producer';
        showAlert({
          message: errorMessage,
          type: 'error',
          duration: 4000,
        });
        setErrors([errorMessage]);
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Error deleting producer:', error);
      const errorMessage = 'Error deleting producer';
      showAlert({
        message: errorMessage,
        type: 'error',
        duration: 4000,
      });
      setErrors([errorMessage]);
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <IconButton
        icon="delete"
        variant="basicSecondary"
        size="sm"
        onClick={() => setOpen(true)}
        title="Delete"
      />
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title=""
        size="xs"
      >
        <DeleteBaseForm
          message={`Are you sure you want to delete the producer "${producer.name}"? This action cannot be undone.`}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          errors={errors}
          cancelButton={true}
          cancelButtonText="Cancel"
          onCancel={() => setOpen(false)}
          submitLabel="Delete"
          title="Delete Producer"
        />
      </Dialog>
    </>
  );
}
