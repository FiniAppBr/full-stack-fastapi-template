import { notifications } from "@mantine/notifications"

const useCustomToast = () => {
  const showSuccessToast = (description: string) => {
    notifications.show({
      title: "Success!",
      message: description,
      color: "green",
    })
  }

  const showErrorToast = (description: string) => {
    notifications.show({
      title: "Something went wrong!",
      message: description,
      color: "red",
    })
  }

  return { showSuccessToast, showErrorToast }
}

export default useCustomToast
