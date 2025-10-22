import { Container, Title, Stack, Radio } from "@mantine/core"
import { useTheme } from "next-themes"

const Appearance = () => {
  const { theme, setTheme } = useTheme()

  return (
    <Container size="xl" p={0}>
      <Title order={4} py={4}>
        Appearance
      </Title>

      <Radio.Group
        value={theme}
        onChange={(value) => setTheme(value ?? "system")}
      >
        <Stack gap={12}>
          <Radio value="system" label="System" color="teal" />
          <Radio value="light" label="Light Mode" color="teal" />
          <Radio value="dark" label="Dark Mode" color="teal" />
        </Stack>
      </Radio.Group>
    </Container>
  )
}
export default Appearance
