import { Container, Stack, Title } from '@mantine/core';
import type { ReactNode } from 'react';

export function PageContainer({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <Container size="md" px={0}>
      <Stack gap="md">
        {title && (
          <Title order={2} size="h3">
            {title}
          </Title>
        )}
        {children}
      </Stack>
    </Container>
  );
}
