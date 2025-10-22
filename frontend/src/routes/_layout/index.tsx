import { Container, Title, Text, Stack } from "@mantine/core"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
})

function Dashboard() {
  return (
    <Container size="lg">
      <Stack gap="xl" mt="xl">
        <Title order={1}>Welcome to ConnectAI</Title>
        <Text size="lg" c="dimmed">
          Your AI-powered connection platform.
        </Text>
        <Text>
          This is your dashboard. Start building your ConnectAI features here!
        </Text>
      </Stack>
    </Container>
  )
}

export default Dashboard
