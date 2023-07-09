import { Button, Typography } from "antd";

const { Paragraph, Text } = Typography;

interface Params {
    finish: () => void,
    slug: string
}

function ShareEmail({ slug, finish }: Params) {
    return (
        <Typography>
            <Paragraph>
                Share with your players the email adress <Text code>{slug}@decklist.fun</Text>.
                <Button onClick={finish} type="primary">Ok!</Button>
            </Paragraph>
        </Typography>
    );
}

export default ShareEmail;