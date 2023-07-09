import { Alert, Button, DatePicker, Form, Input, Steps } from "antd";
import { useState } from "react";
import { useAppSelector } from "../../app/hooks";
import { selectToken } from "../../features/login/loginSlice";

type CreateResponse = { ok: true, slug: string } | { ok: false, error: string };

export async function createEvent(token: string, values: any): Promise<CreateResponse> {
    const { slug, password, date, name } = values;

    const resp = await fetch('/events/' + slug, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify({
            password, date: date.unix(), name
        })
    });
    if (resp.status == 201) {
        return { ok: true, slug };
    }
    const error = await resp.text();
    return { ok: false, error };
}


interface Params {
    finish: (slug: string) => void
}

function CreateStep({ finish }: Params) {
    const token = useAppSelector(selectToken);
    const [error, setError] = useState<string | null>(null);

    const onFinish = async (values: any) => {
        const res = await createEvent(token, values);
        if (res.ok) {
            finish(res.slug);
        } else {
            setError(res.error);
        }
    };

    const onClose = () => setError(null);

    return (
        <>
            {error && <Alert
                message={error}
                type="error"
                closable
                onClose={onClose}
            />}
            <Form
                name="basic"
                labelCol={{ span: 8 }}
                wrapperCol={{ span: 16 }}
                style={{ maxWidth: 600 }}
                initialValues={{ remember: true }}
                onFinish={onFinish}
                autoComplete="off"
            >
                <Form.Item
                    label="Slug"
                    name="slug"
                    tooltip="This will be the email adress [slug]@decklist.fun"
                    rules={[{ required: true, message: 'Please input the event slug' }]}
                >
                    <Input />
                </Form.Item>

                <Form.Item
                    label="Name"
                    name="name"
                    rules={[{ required: true, message: 'Please input the event name' }]}
                >
                    <Input />
                </Form.Item>

                <Form.Item
                    label="Password"
                    name="password"
                    tooltip="You will need the password to share the inbox. Don't use a personal password."
                    rules={[{ required: true, message: 'Please input the event password' }]}
                >
                    <Input.Password />
                </Form.Item>

                <Form.Item
                    label="Date"
                    name="date"
                    rules={[{ required: true, message: 'Please input the event\'s date' }]}
                >
                    <DatePicker />
                </Form.Item>

                <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
                    <Button type="primary" htmlType="submit">
                        Submit
                    </Button>
                </Form.Item>
            </Form>
        </>
    );
}

export default CreateStep;