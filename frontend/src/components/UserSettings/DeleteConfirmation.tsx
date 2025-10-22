import { Button, Group, Text, Modal } from "@mantine/core"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { type ApiError, UsersService } from "@/client"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

const DeleteConfirmation = () => {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const {
    handleSubmit,
    formState: { isSubmitting },
  } = useForm()
  const { logout } = useAuth()

  const mutation = useMutation({
    mutationFn: () => UsersService.deleteUserMe(),
    onSuccess: () => {
      showSuccessToast("Your account has been successfully deleted")
      setIsOpen(false)
      logout()
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] })
    },
  })

  const onSubmit = async () => {
    mutation.mutate()
  }

  return (
    <>
      <Button variant="filled" color="red" mt={16} onClick={() => setIsOpen(true)}>
        Delete
      </Button>

      <Modal
        opened={isOpen}
        onClose={() => setIsOpen(false)}
        title="Confirmation Required"
        centered
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <Text mb={16}>
            All your account data will be{" "}
            <strong>permanently deleted.</strong> If you are sure, please
            click <strong>"Confirm"</strong> to proceed. This action cannot be
            undone.
          </Text>

          <Group justify="flex-end" gap={8}>
            <Button
              variant="subtle"
              color="gray"
              disabled={isSubmitting}
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="filled"
              color="red"
              type="submit"
              loading={isSubmitting}
            >
              Delete
            </Button>
          </Group>
        </form>
      </Modal>
    </>
  )
}

export default DeleteConfirmation
