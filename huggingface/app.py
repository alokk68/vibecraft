import base64
import io
import sys
import types
from PIL import Image
import numpy as np
import cv2
import gradio as gr
import spaces
import torch

# GFPGAN / basicsr compatibility shim for newer torchvision
import torchvision.transforms.functional as F
try:
    import torchvision.transforms.functional_tensor  # noqa
except ModuleNotFoundError:
    shim = types.ModuleType("torchvision.transforms.functional_tensor")
    shim.rgb_to_grayscale = F.rgb_to_grayscale
    sys.modules["torchvision.transforms.functional_tensor"] = shim

from gfpgan import GFPGANer
from realesrgan import RealESRGANer
from basicsr.archs.rrdbnet_arch import RRDBNet

# Global model cache (lazy loaded)
models = {
    'gfpgan': None,
    'realesrgan': None,
    'anime': None
}

def resize_image(img_array, max_size=1024):
    h, w = img_array.shape[:2]
    if max(h, w) > max_size:
        scale = max_size / max(h, w)
        new_w = int(w * scale)
        new_h = int(h * scale)
        img_array = cv2.resize(img_array, (new_w, new_h), interpolation=cv2.INTER_AREA)
    return img_array

def load_realesrgan():
    if models['realesrgan'] is None:
        model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=4)
        models['realesrgan'] = RealESRGANer(
            scale=4,
            model_path='https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth',
            model=model,
            tile=400,
            tile_pad=10,
            pre_pad=0,
            half=True
        )
    return models['realesrgan']

def load_gfpgan():
    if models['gfpgan'] is None:
        bg_upsampler = load_realesrgan()
        models['gfpgan'] = GFPGANer(
            model_path='https://github.com/TencentARC/GFPGAN/releases/download/v1.3.0/GFPGANv1.3.pth',
            upscale=2,
            arch='clean',
            channel_multiplier=2,
            bg_upsampler=bg_upsampler
        )
    return models['gfpgan']

def load_anime():
    if models['anime'] is None:
        model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=6, num_grow_ch=32, scale=4)
        models['anime'] = RealESRGANer(
            scale=4,
            model_path='https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.2.4/RealESRGAN_x4plus_anime_6B.pth',
            model=model,
            tile=400,
            tile_pad=10,
            pre_pad=0,
            half=True
        )
    return models['anime']

@spaces.GPU(duration=120)
def process_image(image_b64, mode):
    try:
        if not image_b64:
            return {"success": False, "error": "No image provided"}
            
        # Strip data URI prefix if present
        if ',' in image_b64:
            image_b64 = image_b64.split(',', 1)[1]
            
        img_bytes = base64.b64decode(image_b64)
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        img_array = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
        img_array = resize_image(img_array, max_size=1024)

        device = torch.device('cuda')

        result_array = None

        if mode == 'face':
            restorer = load_gfpgan()
            restorer.device = device
            if hasattr(restorer.gfpgan, 'to'):
                restorer.gfpgan.to(device)
            if hasattr(restorer.bg_upsampler.model, 'to'):
                restorer.bg_upsampler.model.to(device)
            _, _, result_array = restorer.enhance(img_array, has_aligned=False, only_center_face=False, paste_back=True)

        elif mode == 'oldphoto':
            upsampler = load_realesrgan()
            upsampler.device = device
            if hasattr(upsampler.model, 'to'):
                upsampler.model.to(device)
            result_array, _ = upsampler.enhance(img_array, outscale=2)

        elif mode == 'anime':
            upsampler = load_anime()
            upsampler.device = device
            if hasattr(upsampler.model, 'to'):
                upsampler.model.to(device)
            result_array, _ = upsampler.enhance(img_array, outscale=2)

        else:
            return {"success": False, "error": f"Invalid mode: {mode}. Use 'face', 'oldphoto', or 'anime'."}

        if result_array is None:
            return {"success": False, "error": "Processing failed."}

        result_rgb = cv2.cvtColor(result_array, cv2.COLOR_BGR2RGB)
        result_img = Image.fromarray(result_rgb)
        
        buffer = io.BytesIO()
        result_img.save(buffer, format="PNG")
        out_b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
        out_data_uri = f"data:image/png;base64,{out_b64}"
        
        return {"success": True, "image": out_data_uri}

    except Exception as e:
        return {"success": False, "error": f"Failed to process image: {str(e)}"}

with gr.Blocks() as app:
    gr.Markdown("# VibeCraft Restore Backend")
    with gr.Row():
        img_in = gr.Textbox(label="Base64 Input Image")
        mode_in = gr.Dropdown(choices=["face", "oldphoto", "anime"], label="Processing Mode")
    btn = gr.Button("Process")
    out = gr.JSON(label="Result")
    
    btn.click(fn=process_image, inputs=[img_in, mode_in], outputs=[out], api_name="restore")

if __name__ == "__main__":
    app.launch()
