export const fileService = {
    exportGLTFX: (gltfx: any) => {
      const blob = new Blob([JSON.stringify(gltfx, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'world.gltfx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  
    loadGLTFX: async (file: File): Promise<any> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const gltfx = JSON.parse(event.target?.result as string);
            resolve(gltfx);
          } catch (error) {
            reject(error);
          }
        };
        reader.readAsText(file);
      });
    }
};