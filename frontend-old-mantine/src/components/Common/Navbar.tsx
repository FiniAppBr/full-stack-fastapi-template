import { Flex, Image } from "@mantine/core"
import { useMediaQuery } from "@mantine/hooks"
import { Link } from "@tanstack/react-router"

import Logo from "/assets/images/fastapi-logo.svg"
import UserMenu from "./UserMenu"

function Navbar() {
  const isMobile = useMediaQuery("(max-width: 768px)")

  return (
    <Flex
      display={isMobile ? "none" : "flex"}
      justify="space-between"
      pos="sticky"
      c="white"
      align="center"
      bg="var(--mantine-color-dark-6)"
      w="100%"
      top={0}
      p="md"
    >
      <Link to="/">
        <Image src={Logo} alt="Logo" maw={300} p="xs" />
      </Link>
      <Flex gap="xs" align="center">
        <UserMenu />
      </Flex>
    </Flex>
  )
}

export default Navbar
