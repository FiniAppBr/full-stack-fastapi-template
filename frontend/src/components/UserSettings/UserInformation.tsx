import {
  Box,
  Button,
  Container,
  Group,
  Title,
  TextInput,
  Text,
} from "@mantine/core"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { type SubmitHandler, useForm } from "react-hook-form"

import {
  type ApiError,
  type UserPublic,
  UsersService,
  type UserUpdateMe,
} from "@/client"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import { emailPattern, handleError } from "@/utils"

const UserInformation = () => {
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const [editMode, setEditMode] = useState(false)
  const { user: currentUser } = useAuth()
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { isSubmitting, errors, isDirty },
  } = useForm<UserPublic>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      full_name: currentUser?.full_name,
      email: currentUser?.email,
    },
  })

  const toggleEditMode = () => {
    setEditMode(!editMode)
  }

  const mutation = useMutation({
    mutationFn: (data: UserUpdateMe) =>
      UsersService.updateUserMe({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast("User updated successfully.")
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries()
    },
  })

  const onSubmit: SubmitHandler<UserUpdateMe> = async (data) => {
    mutation.mutate(data)
  }

  const onCancel = () => {
    reset()
    toggleEditMode()
  }

  return (
    <Container size="xl" p={0}>
      <Title order={4} py={4}>
        User Information
      </Title>
      <Box
        w={{ base: "100%", md: 400 }}
        component="form"
        onSubmit={handleSubmit(onSubmit)}
      >
        {editMode ? (
          <TextInput
            label="Full name"
            {...register("full_name", { maxLength: 30 })}
            type="text"
            size="md"
          />
        ) : (
          <Box>
            <Text size="sm" fw={500} mb={4}>
              Full name
            </Text>
            <Text
              size="md"
              py={2}
              c={!currentUser?.full_name ? "dimmed" : undefined}
              lineClamp={1}
              maw={400}
            >
              {currentUser?.full_name || "N/A"}
            </Text>
          </Box>
        )}

        {editMode ? (
          <TextInput
            label="Email"
            {...register("email", {
              required: "Email is required",
              pattern: emailPattern,
            })}
            type="email"
            size="md"
            error={errors.email?.message}
            mt={16}
          />
        ) : (
          <Box mt={16}>
            <Text size="sm" fw={500} mb={4}>
              Email
            </Text>
            <Text size="md" py={2} lineClamp={1} maw={400}>
              {currentUser?.email}
            </Text>
          </Box>
        )}

        <Group mt={16} gap={12}>
          <Button
            variant="filled"
            onClick={toggleEditMode}
            type={editMode ? "button" : "submit"}
            loading={editMode ? isSubmitting : false}
            disabled={editMode ? !isDirty || !getValues("email") : false}
          >
            {editMode ? "Save" : "Edit"}
          </Button>
          {editMode && (
            <Button
              variant="subtle"
              color="gray"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
        </Group>
      </Box>
    </Container>
  )
}

export default UserInformation
