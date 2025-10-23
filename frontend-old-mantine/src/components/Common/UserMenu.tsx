import { Button, Flex, Group, Menu, Text } from "@mantine/core"
import { Link } from "@tanstack/react-router"
import { FaUserAstronaut } from "react-icons/fa"
import { FiLogOut, FiUser } from "react-icons/fi"

import useAuth from "@/hooks/useAuth"

const UserMenu = () => {
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    logout()
  }

  return (
    <>
      {/* Desktop */}
      <Flex>
        <Menu>
          <Menu.Target>
            <Button
              data-testid="user-menu"
              variant="filled"
              maw={384}
              leftSection={<FaUserAstronaut size={18} />}
              styles={{
                label: {
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }
              }}
            >
              <Text truncate>{user?.full_name || "User"}</Text>
            </Button>
          </Menu.Target>

          <Menu.Dropdown>
            <Link to="/settings" style={{ textDecoration: "none", color: "inherit" }}>
              <Menu.Item
                leftSection={<FiUser size={18} />}
              >
                My Profile
              </Menu.Item>
            </Link>

            <Menu.Item
              leftSection={<FiLogOut />}
              onClick={handleLogout}
            >
              Log Out
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Flex>
    </>
  )
}

export default UserMenu
