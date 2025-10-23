import { Box, Flex, Text, ThemeIcon } from "@mantine/core"
import { useQueryClient } from "@tanstack/react-query"
import { Link as RouterLink } from "@tanstack/react-router"
import { FiBriefcase, FiHome, FiSettings, FiUsers } from "react-icons/fi"
import type { IconType } from "react-icons/lib"

import type { UserPublic } from "@/client"

const items = [
  { icon: FiHome, title: "Dashboard", path: "/" },
  { icon: FiBriefcase, title: "Items", path: "/items" },
  { icon: FiSettings, title: "User Settings", path: "/settings" },
]

interface SidebarItemsProps {
  onClose?: () => void
}

interface Item {
  icon: IconType
  title: string
  path: string
}

const SidebarItems = ({ onClose }: SidebarItemsProps) => {
  const queryClient = useQueryClient()
  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"])

  const finalItems: Item[] = currentUser?.is_superuser
    ? [...items, { icon: FiUsers, title: "Admin", path: "/admin" }]
    : items

  const listItems = finalItems.map(({ icon: Icon, title, path }) => (
    <RouterLink key={title} to={path} onClick={onClose}>
      <Flex
        gap="md"
        px="md"
        py="xs"
        style={{
          textDecoration: "none",
          color: "inherit",
          borderRadius: "var(--mantine-radius-sm)",
          cursor: "pointer",
        }}
        sx={{
          "&:hover": {
            background: "var(--mantine-color-dark-5)",
          },
        }}
        align="center"
      >
        <ThemeIcon variant="transparent" size="sm">
          <Icon />
        </ThemeIcon>
        <Text size="sm" ml="xs">{title}</Text>
      </Flex>
    </RouterLink>
  ))

  return (
    <>
      <Text size="xs" px="md" py="xs" fw="bold">
        Menu
      </Text>
      <Box>{listItems}</Box>
    </>
  )
}

export default SidebarItems
