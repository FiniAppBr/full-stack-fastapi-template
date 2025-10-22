import { ActionIcon, Box, Drawer, Flex, Text } from "@mantine/core"
import { useMediaQuery } from "@mantine/hooks"
import { useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { FaBars } from "react-icons/fa"
import { FiLogOut } from "react-icons/fi"

import type { UserPublic } from "@/client"
import useAuth from "@/hooks/useAuth"
import SidebarItems from "./SidebarItems"

const Sidebar = () => {
  const queryClient = useQueryClient()
  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"])
  const { logout } = useAuth()
  const [open, setOpen] = useState(false)
  const isMobile = useMediaQuery("(max-width: 768px)")

  return (
    <>
      {/* Mobile */}
      <Drawer
        position="left"
        opened={open}
        onClose={() => setOpen(false)}
        size="xs"
      >
        <Drawer.Body>
          <Flex direction="column" justify="space-between">
            <Box>
              <SidebarItems onClose={() => setOpen(false)} />
              <Flex
                component="button"
                onClick={() => {
                  logout()
                }}
                align="center"
                gap="md"
                px="md"
                py="xs"
                style={{ background: "none", border: "none", cursor: "pointer", width: "100%" }}
              >
                <FiLogOut />
                <Text>Log Out</Text>
              </Flex>
            </Box>
            {currentUser?.email && (
              <Text size="sm" p="xs" truncate maw={384}>
                Logged in as: {currentUser.email}
              </Text>
            )}
          </Flex>
        </Drawer.Body>
      </Drawer>

      <ActionIcon
        variant="subtle"
        color="gray"
        display={isMobile ? "flex" : "none"}
        aria-label="Open Menu"
        pos="absolute"
        style={{ zIndex: 100 }}
        m="md"
        onClick={() => setOpen(true)}
        size="lg"
      >
        <FaBars />
      </ActionIcon>

      {/* Desktop */}

      <Box
        display={isMobile ? "none" : "flex"}
        pos="sticky"
        bg="var(--mantine-color-dark-7)"
        top={0}
        miw={320}
        h="100vh"
        p="md"
      >
        <Box w="100%">
          <SidebarItems />
        </Box>
      </Box>
    </>
  )
}

export default Sidebar
