import { useParams } from "react-router-dom";

function Event() {
    let { slug } = useParams();
    return (
        <div>
            Slug: {slug}
        </div>
    );
}

export default Event;