import { Anchor, Text } from '@mantine/core';
import { Link } from 'react-router-dom';
import { PageContainer } from '@/components/PageContainer';

export function NotFoundPage() {
  return (
    <PageContainer title="ページが見つかりません">
      <Text>
        <Anchor component={Link} to="/">
          エディタに戻る
        </Anchor>
      </Text>
    </PageContainer>
  );
}
