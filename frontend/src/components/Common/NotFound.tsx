import { Button, Center, Flex, Text } from "@mantine/core"
import { useMediaQuery } from "@mantine/hooks"
import { Link } from "@tanstack/react-router"

const NotFound = () => {
  const isMobile = useMediaQuery("(max-width: 768px)")

  return (
    <Flex
      h="100vh"
      align="center"
      justify="center"
      direction="column"
      data-testid="not-found"
      p="md"
    >
      <Flex align="center" style={{ zIndex: 1 }}>
        <Flex direction="column" ml="md" align="center" justify="center" p="md">
          <Text
            size={isMobile ? "6rem" : "8rem"}
            fw="bold"
            lh="1"
            mb="md"
          >
            404
          </Text>
          <Text size="xl" fw="bold" mb="xs">
            Oops!
          </Text>
        </Flex>
      </Flex>

      <Text size="lg" c="dimmed" mb="md" ta="center" style={{ zIndex: 1 }}>
        The page you are looking for was not found.
      </Text>
      <Center style={{ zIndex: 1 }}>
        <Link to="/">
          <Button variant="filled" color="teal" mt="md">
            Go Back
          </Button>
        </Link>
      </Center>
    </Flex>
  )
}

export default NotFound
