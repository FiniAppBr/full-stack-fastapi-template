import { Container, Image, TextInput, Text, Button, PasswordInput, Stack, Anchor } from "@mantine/core"
import {
  createFileRoute,
  Link as RouterLink,
  redirect,
} from "@tanstack/react-router"
import { type SubmitHandler, useForm } from "react-hook-form"
import { FiLock, FiUser } from "react-icons/fi"

import type { UserRegister } from "@/client"
import useAuth, { isLoggedIn } from "@/hooks/useAuth"
import { confirmPasswordRules, emailPattern, passwordRules } from "@/utils"
import Logo from "/assets/images/fastapi-logo.svg"

export const Route = createFileRoute("/signup")({
  component: SignUp,
  beforeLoad: async () => {
    if (isLoggedIn()) {
      throw redirect({
        to: "/",
      })
    }
  },
})

interface UserRegisterForm extends UserRegister {
  confirm_password: string
}

function SignUp() {
  const { signUpMutation } = useAuth()
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<UserRegisterForm>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      email: "",
      full_name: "",
      password: "",
      confirm_password: "",
    },
  })

  const onSubmit: SubmitHandler<UserRegisterForm> = (data) => {
    signUpMutation.mutate(data)
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
            {...register("full_name", {
              required: "Full Name is required",
            })}
            label="Full Name"
            placeholder="Full Name"
            leftSection={<FiUser />}
            error={errors.full_name?.message}
            minLength={3}
          />
          <TextInput
            {...register("email", {
              required: "Email is required",
              pattern: emailPattern,
            })}
            label="Email"
            placeholder="Email"
            type="email"
            leftSection={<FiUser />}
            error={errors.email?.message}
          />
          <PasswordInput
            {...register("password", passwordRules())}
            label="Password"
            placeholder="Password"
            leftSection={<FiLock />}
            error={errors.password?.message}
          />
          <PasswordInput
            {...register("confirm_password", confirmPasswordRules(getValues))}
            label="Confirm Password"
            placeholder="Confirm Password"
            leftSection={<FiLock />}
            error={errors.confirm_password?.message}
          />
          <Button type="submit" loading={isSubmitting} fullWidth>
            Sign Up
          </Button>
          <Text size="sm" ta="center">
            Already have an account?{" "}
            <Anchor component={RouterLink} to="/login">
              Log In
            </Anchor>
          </Text>
        </Stack>
      </form>
    </Container>
  )
}

export default SignUp
