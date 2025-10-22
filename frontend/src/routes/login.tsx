import { Container, Image, TextInput, Text, Button, PasswordInput, Stack, Group, Anchor } from "@mantine/core"
import {
  createFileRoute,
  Link as RouterLink,
  redirect,
} from "@tanstack/react-router"
import { type SubmitHandler, useForm } from "react-hook-form"
import { FiLock, FiMail } from "react-icons/fi"

import type { Body_login_login_access_token as AccessToken } from "@/client"
import useAuth, { isLoggedIn } from "@/hooks/useAuth"
import Logo from "/assets/images/fastapi-logo.svg"
import { emailPattern, passwordRules } from "../utils"

export const Route = createFileRoute("/login")({
  component: Login,
  beforeLoad: async () => {
    if (isLoggedIn()) {
      throw redirect({
        to: "/",
      })
    }
  },
})

function Login() {
  const { loginMutation, error, resetError } = useAuth()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AccessToken>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      username: "",
      password: "",
    },
  })

  const onSubmit: SubmitHandler<AccessToken> = async (data) => {
    if (isSubmitting) return

    resetError()

    try {
      await loginMutation.mutateAsync(data)
    } catch {
      // error is handled by useAuth hook
    }
  }

  return (
    <Container size="xs" style={{ height: "100vh", display: "flex", alignItems: "center" }}>
      <form onSubmit={handleSubmit(onSubmit)} style={{ width: "100%" }}>
        <Stack gap="md">
          <Image
            src={Logo}
            alt="FastAPI logo"
            style={{ height: "auto", maxWidth: "200px", margin: "0 auto" }}
          />
          <TextInput
            {...register("username", {
              required: "Username is required",
              pattern: emailPattern,
            })}
            label="Email"
            placeholder="Email"
            type="email"
            leftSection={<FiMail />}
            error={errors.username?.message || (error ? "Invalid credentials" : undefined)}
          />
          <PasswordInput
            {...register("password", passwordRules())}
            label="Password"
            placeholder="Password"
            leftSection={<FiLock />}
            error={errors.password?.message}
          />
          <Anchor component={RouterLink} to="/recover-password" size="sm">
            Forgot Password?
          </Anchor>
          <Button type="submit" loading={isSubmitting} fullWidth>
            Log In
          </Button>
          <Text size="sm" ta="center">
            Don't have an account?{" "}
            <Anchor component={RouterLink} to="/signup">
              Sign Up
            </Anchor>
          </Text>
        </Stack>
      </form>
    </Container>
  )
}
