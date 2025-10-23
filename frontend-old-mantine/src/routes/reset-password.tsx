import { Container, Title, Text, Button, PasswordInput, Stack } from "@mantine/core"
import { useMutation } from "@tanstack/react-query"
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { type SubmitHandler, useForm } from "react-hook-form"
import { FiLock } from "react-icons/fi"

import { type ApiError, LoginService, type NewPassword } from "@/client"
import { isLoggedIn } from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import { confirmPasswordRules, handleError, passwordRules } from "@/utils"

interface NewPasswordForm extends NewPassword {
  confirm_password: string
}

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
  beforeLoad: async () => {
    if (isLoggedIn()) {
      throw redirect({
        to: "/",
      })
    }
  },
})

function ResetPassword() {
  const {
    register,
    handleSubmit,
    getValues,
    reset,
    formState: { errors },
  } = useForm<NewPasswordForm>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      new_password: "",
    },
  })
  const { showSuccessToast } = useCustomToast()
  const navigate = useNavigate()

  const resetPassword = async (data: NewPassword) => {
    const token = new URLSearchParams(window.location.search).get("token")
    if (!token) return
    await LoginService.resetPassword({
      requestBody: { new_password: data.new_password, token: token },
    })
  }

  const mutation = useMutation({
    mutationFn: resetPassword,
    onSuccess: () => {
      showSuccessToast("Password updated successfully.")
      reset()
      navigate({ to: "/login" })
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
  })

  const onSubmit: SubmitHandler<NewPasswordForm> = async (data) => {
    mutation.mutate(data)
  }

  return (
    <Container size="xs" style={{ height: "100vh", display: "flex", alignItems: "center" }}>
      <form onSubmit={handleSubmit(onSubmit)} style={{ width: "100%" }}>
        <Stack gap="md">
          <Title order={1} ta="center" mb="md">
            Reset Password
          </Title>
          <Text ta="center">
            Please enter your new password and confirm it to reset your password.
          </Text>
          <PasswordInput
            {...register("new_password", passwordRules())}
            placeholder="New Password"
            leftSection={<FiLock />}
            error={errors.new_password?.message}
          />
          <PasswordInput
            {...register("confirm_password", confirmPasswordRules(getValues))}
            placeholder="Confirm Password"
            leftSection={<FiLock />}
            error={errors.confirm_password?.message}
          />
          <Button type="submit" fullWidth>
            Reset Password
          </Button>
        </Stack>
      </form>
    </Container>
  )
}
