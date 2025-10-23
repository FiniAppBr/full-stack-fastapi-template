import { Flex } from "@mantine/core"
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"

import Navbar from "@/components/Common/Navbar"
import Sidebar from "@/components/Common/Sidebar"
import { isLoggedIn } from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout")({
  component: Layout,
  beforeLoad: async () => {
    if (!isLoggedIn()) {
      throw redirect({
        to: "/login",
      })
    }
  },
})

function Layout() {
  return (
    <Flex direction="column" style={{ height: "100vh" }}>
      <Navbar />
      <Flex style={{ flex: 1, overflow: "hidden" }}>
        <Sidebar />
        <Flex direction="column" p="md" style={{ flex: 1, overflowY: "auto" }}>
          <Outlet />
        </Flex>
      </Flex>
    </Flex>
  )
}

export default Layout
