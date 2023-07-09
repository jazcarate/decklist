import { useState } from "react";

import { Steps } from "antd";
import CreateStep from "./CreateStep";
import ShareEmail from "./ShareEmail";
import GoToEvent from "./GoToEvent";

function CreateEvent() {
    const [current, setCurrent] = useState(2);
    const [slug, setSlug] = useState("asd");

    const created = (slug: string) => {
        setSlug(slug);
        setCurrent(1);
    }

    const shared = () => {
        setCurrent(2);
    }

    return (
        <>
            <Steps
                current={current}
                onChange={setCurrent}
                items={[
                    { title: 'Create an event' },
                    { title: 'Share the email adress' },
                    { title: 'Get deckchecking' },
                ]}
            />
            {current == 0 && <CreateStep finish={created} />}
            {current == 1 && <ShareEmail slug={slug} finish={shared} />}
            {current == 2 && <GoToEvent slug={slug} />}
        </>
    );
}

export default CreateEvent;