import { Box, Button, Container, Title, Stack, PasswordInput } from "@mantine/core"
import { useMutation } from "@tanstack/react-query"
import { type SubmitHandler, useForm } from "react-hook-form"
import { FiLock } from "react-icons/fi"

import { type ApiError, type UpdatePassword, UsersService } from "@/client"
import useCustomToast from "@/hooks/useCustomToast"
import { confirmPasswordRules, handleError, passwordRules } from "@/utils"

interface UpdatePasswordForm extends UpdatePassword {
  confirm_password: string
}

const ChangePassword = () => {
  const { showSuccessToast } = useCustomToast()
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<UpdatePasswordForm>({
    mode: "onBlur",
    criteriaMode: "all",
  })

  const mutation = useMutation({
    mutationFn: (data: UpdatePassword) =>
      UsersService.updatePasswordMe({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast("Password updated successfully.")
      reset()
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
  })

  const onSubmit: SubmitHandler<UpdatePasswordForm> = async (data) => {
    mutation.mutate(data)
  }

  return (
    <Container size="xl" p={0}>
      <Title order={4} py={4}>
        Change Password
      </Title>
      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <Stack gap={16} w={{ base: "100%", md: 400 }}>
          <PasswordInput
            {...register("current_password", passwordRules())}
            placeholder="Current Password"
            leftSection={<FiLock />}
            error={errors.current_password?.message}
            size="md"
          />
          <PasswordInput
            {...register("new_password", passwordRules())}
            placeholder="New Password"
            leftSection={<FiLock />}
            error={errors.new_password?.message}
            size="md"
          />
          <PasswordInput
            {...register("confirm_password", confirmPasswordRules(getValues))}
            placeholder="Confirm Password"
            leftSection={<FiLock />}
            error={errors.confirm_password?.message}
            size="md"
          />
        </Stack>
        <Button variant="filled" mt={16} type="submit" loading={isSubmitting}>
          Save
        </Button>
      </Box>
    </Container>
  )
}
export default ChangePassword
