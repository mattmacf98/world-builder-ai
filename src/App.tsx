import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import WorldBuilder from './pages/WorldBuilder';
import Worlds from './pages/Worlds';
import Macros from './pages/Macros';
import './App.css';
import { Navbar, Container, Nav } from 'react-bootstrap';

const App = () => {
  return (
    <BrowserRouter>
      <Navbar bg="dark" variant="dark" expand="lg">
        <Container>
          <Navbar.Brand as={Link} to="/">World Builder AI</Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link as={Link} to="/">World Builder</Nav.Link>
              <Nav.Link as={Link} to="/worlds">Worlds</Nav.Link>
              <Nav.Link as={Link} to="/macros">Macros</Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      
        <Routes>
          <Route path="/" element={<WorldBuilder />} />
          <Route path="/worlds" element={<Worlds />} />
          <Route path="/macros" element={<Macros />} />
        </Routes>
    </BrowserRouter>
  );
}

export default App;