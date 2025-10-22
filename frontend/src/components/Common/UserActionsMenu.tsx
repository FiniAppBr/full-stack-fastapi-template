import { ActionIcon, Menu } from "@mantine/core"
import { BsThreeDotsVertical } from "react-icons/bs"
import type { UserPublic } from "@/client"
import DeleteUser from "../Admin/DeleteUser"
import EditUser from "../Admin/EditUser"

interface UserActionsMenuProps {
  user: UserPublic
  disabled?: boolean
}

export const UserActionsMenu = ({ user, disabled }: UserActionsMenuProps) => {
  return (
    <Menu>
      <Menu.Target>
        <ActionIcon variant="subtle" color="gray" disabled={disabled}>
          <BsThreeDotsVertical />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <EditUser user={user} />
        <DeleteUser id={user.id} />
      </Menu.Dropdown>
    </Menu>
  )
}
