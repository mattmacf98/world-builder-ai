# Try it out

The Best way to try it out is to go to the live app at [world-builder-ai](https://world-builder-ai-e4e4058da945.herokuapp.com/). To enable the AI Chat feature, you will need to add use Chrome built in AI https://developer.chrome.com/docs/ai/built-in

# Running locally

To run the app locally, you will need to have convex set up and node.js installed. Then be sure to run 
```npm install```

Then you must configure your VITE_CONVEX_URL environment variable. Run 
```npx convex dev``` to set up your convex environment. 

Once your backend is running, you can run the following command to start the frontend:
```npm run dev```

# World Builder Keyboard Commands
- toggle scale gizmo `s`
- toggle translate gizmo `t`
- toggle rotation gizmo `r`
- move with arrow keys
- delete selected object with `backspace`

# Macro Page UI
- right click to add nodes
- drag connectors to link nodes together