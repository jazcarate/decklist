import { Button, Typography } from 'antd';
import { useNavigate, Link } from "react-router-dom";

const { Title, Paragraph } = Typography;

function Home() {
    const navigate = useNavigate();
    return (
        <Typography>
            <Title>What is this?</Title>
            <Paragraph>
                This application lets you create a throwaway email adress so that players can send you their decklists.

                You can also share the email inbox with other judges.
            </Paragraph>

            <Link to="/e">
                <Button type="primary">Create event</Button>
            </Link>
        </Typography>
    );
}

export default Home;
