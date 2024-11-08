# World Creator AI Roadmap

**Project Description:**  
World Creator AI is a powerful in-browser world-building tool powered by Babylon.js and glTF models. With the advent of browser-based LLMs, this project leverages local language models to make 3D world creation accessible through text, GUI, and VR interfaces. Users can use the editor to create and manipulate 3D objects, apply materials and lighting, and execute commands using natural language, all within a browser environment.

---

### Phase 1: Basic World Editor in Babylon.js

**Goal:** Build the foundation for the world editor, enabling users to interact with 3D shapes and models.

- **Features:**
  - **Shape Manipulation:** Support for creation, deletion, rotation, translation, and scaling of basic 3D shapes (e.g., cubes, spheres).
  - **GLTF Model Support:** Enable loading, positioning, and manipulation of glTF models.
  - **GUI Interface:** Provide a GUI panel or function call interface to simplify interactions with shapes and models.
  
- **Milestones:**
  - Implement Babylon.js 3D canvas with basic shape creation and manipulation.
  - Integrate glTF model loading and manipulation.
  - Develop a basic GUI for selecting objects and performing transformations.

---

### Phase 2: Lighting and Material Application

**Goal:** Extend editor functionality to include lighting and materials, enhancing visual realism.

- **Features:**
  - **Lighting Control:** Add options to create and adjust light sources (e.g., directional, point, and spotlights).
  - **Material Application:** Allow users to apply basic materials (e.g., colors, textures) to non-glTF objects.
  - **GUI for Lights and Materials:** Expand the interface for managing lights and materials easily.

- **Milestones:**
  - Implement lighting options and material application.
  - Update GUI to include lighting and material options.
  - Add presets for common lighting setups.

---

### Phase 3: Macros and Workflow Automation

**Goal:** Introduce macros for commonly used actions and build a workflow for reusable commands.

- **Features:**
  - **Macro System:** Allow users to create and save macros, such as "Create a cube of size x, y, z with red material."
  - **React Flow Integration:** Use React Flow for designing workflows, with macros configurable through a visual interface.
  - **LLM Input Parsing:** Integrate local LLM to parse natural language inputs for macro creation.

- **Milestones:**
  - Develop a macro system with a simple API for reusable actions.
  - Integrate React Flow for macro management.
  - Use local LLM to interpret user commands and set macro parameters.

---

### Phase 4: Full LLM Control

**Goal:** Enable complete LLM-driven interaction, allowing users to build worlds purely through text commands.

- **Features:**
  - **LLM API Integration:** Connect all editor functionalities to an LLM-powered API for natural language control.
  - **Enhanced Prompting System:** Expand prompt recognition to cover complex tasks, sequences, and parameterized object creation.
  
- **Milestones:**
  - Complete LLM integration for full control of editor functions.
  - Test and refine prompt handling for accuracy and reliability.
  - Optimize for complex command sequences and world-building tasks.

---

### Phase 5: Voice Commands and VR Mode

**Goal:** Enhance accessibility by introducing voice input and a VR mode for immersive interaction.

- **Features:**
  - **Voice Input:** Enable voice recognition for spoken commands, processed through the LLM to control world creation.
  - **VR Compatibility:** Add support for VR devices to allow immersive world editing.

- **Milestones:**
  - Implement voice input using Web Speech API or similar tool.
  - Integrate VR mode with Babylon.js for immersive world-building.
  - Refine user experience for VR interactions.

---

### Future Considerations

**Long-Term Enhancements:**
- **Multiplayer Collaboration:** Enable multiple users to work on the same world in real-time.
- **Object Libraries:** Provide pre-built libraries of objects, lighting, and materials for rapid prototyping.
- **Procedural Generation:** Allow procedural generation of landscapes, structures, or other assets based on prompts.

---

This roadmap serves as a structured guide for developing *World Creator AI* from a basic editor into a fully interactive, AI-driven 3D creation tool. Each phase builds on the previous, adding layers of functionality and accessibility for users of all skill levels.
