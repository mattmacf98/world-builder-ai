import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Row, Card, Col, Container } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

export default function Worlds() {
    const worlds = useQuery(api.world.getWorlds);
    const navigate = useNavigate();
    return (
        <Container>
            <h1>Worlds</h1>
            <Row className="g-4">
                {worlds?.map((world) => (
                    <Col key={world._id} xs={12} md={6} lg={4}>
                        <Card
                            onClick={() => navigate(`/?worldId=${world._id}`)}
                            style={{ cursor: 'pointer' }}
                        >
                            <Card.Body>
                                <Card.Title>{world.name}</Card.Title>
                                <Card.Text>Created: {new Date(world.createdAt).toLocaleDateString()}</Card.Text>
                            </Card.Body>
                        </Card>
                    </Col>
                ))}
            </Row>
        </Container>
    );
}