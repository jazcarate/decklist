import { Link } from "react-router-dom";
import { Button, Typography } from "antd";

const { Paragraph } = Typography;

interface Params {
    slug: string
}

function GoToEvent({ slug }: Params) {
    const eventLink = `${window.location.protocol}//${window.location.host}/e/${slug}`;

    return (
        <Typography>
            <Paragraph>
                Access the inbox, and share with your team the link: <Link to={eventLink}>
                    {eventLink}
                </Link>.
                <Link to={eventLink}>
                    <Button type="primary">Ok!</Button>
                </Link>
            </Paragraph>
        </Typography>
    );
}

export default GoToEvent;