import os
from PIL import Image

def update_logo(source_path, static_dir):
    try:
        img = Image.open(source_path)
        
        # Ensure static directory exists
        if not os.path.exists(static_dir):
            os.makedirs(static_dir)

        # distinct sizes
        sizes = {
            'icon-512.png': (512, 512),
            'icon-192.png': (192, 192),
            'favicon.png': (32, 32),
            'logo.png': (None, None) # Keep aspect ratio, maybe max 200 height? 
                                     # Actually, let's keep original size for logo.png or resize to meaningful web size
        }

        # Save logo.png (for header)
        # If the image is very large, maybe resize it to proper width/height for web?
        # Let's check original size first.
        print(f"Original size: {img.size}")
        
        # Save main logo
        img.save(os.path.join(static_dir, 'logo.png'), 'PNG')
        print(f"Saved logo.png")

        # Save icons
        for name, size in sizes.items():
            if name == 'logo.png': continue
            
            # Resize with LANCZOS for high quality
            resized = img.resize(size, Image.Resampling.LANCZOS)
            resized.save(os.path.join(static_dir, name), 'PNG')
            print(f"Saved {name}")

        # Save favicon.ico
        # usually includes 16, 32, 48, 64, 128, 256
        ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64)] 
        img.save(os.path.join(static_dir, 'favicon.ico'), format='ICO', sizes=ico_sizes)
        print("Saved favicon.ico")

        print("All images updated successfully.")

    except Exception as e:
        print(f"Error updating logo: {e}")

if __name__ == "__main__":
    source_image = r"C:/Users/pc/.gemini/antigravity/brain/2c4e8fb2-5903-41d7-91ba-6a987054382f/uploaded_image_1766663399878.jpg"
    dest_dir = r"c:/Users/pc/Desktop/Pi Ledger/static"
    update_logo(source_image, dest_dir)
