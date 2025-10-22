import { Container, TextInput, Text, Button, Stack, Title } from "@mantine/core"
import { useMutation } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { type SubmitHandler, useForm } from "react-hook-form"
import { FiMail } from "react-icons/fi"

import { type ApiError, LoginService } from "@/client"
import { isLoggedIn } from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import { emailPattern, handleError } from "@/utils"

interface FormData {
  email: string
}

export const Route = createFileRoute("/recover-password")({
  component: RecoverPassword,
  beforeLoad: async () => {
    if (isLoggedIn()) {
      throw redirect({
        to: "/",
      })
    }
  },
})

function RecoverPassword() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>()
  const { showSuccessToast } = useCustomToast()

  const recoverPassword = async (data: FormData) => {
    await LoginService.recoverPassword({
      email: data.email,
    })
  }

  const mutation = useMutation({
    mutationFn: recoverPassword,
    onSuccess: () => {
      showSuccessToast("Password recovery email sent successfully.")
      reset()
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
  })

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    mutation.mutate(data)
  }

  return (
    <Container size="xs" style={{ height: "100vh", display: "flex", alignItems: "center" }}>
      <form onSubmit={handleSubmit(onSubmit)} style={{ width: "100%" }}>
        <Stack gap="md">
          <Title order={1} ta="center" mb="md">
            Password Recovery
          </Title>
          <Text ta="center">
            A password recovery email will be sent to the registered account.
          </Text>
          <TextInput
            {...register("email", {
              required: "Email is required",
              pattern: emailPattern,
            })}
            placeholder="Email"
            type="email"
            leftSection={<FiMail />}
            error={errors.email?.message}
          />
          <Button type="submit" loading={isSubmitting} fullWidth>
            Continue
          </Button>
        </Stack>
      </form>
    </Container>
  )
}
