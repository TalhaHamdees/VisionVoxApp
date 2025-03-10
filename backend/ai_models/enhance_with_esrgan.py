#!/usr/bin/env python3
import os
import sys
import argparse
import cv2
import numpy as np
import subprocess
import shutil

def enhance_image(input_path, output_path, options):
    """Enhance an image using ESRGAN."""
    try:
        print(f"Debug: Starting enhancement process")
        print(f"Debug: Input path: {input_path}")
        print(f"Debug: Output path: {output_path}")
        print(f"Debug: Options: {options}")
        
        # Check if input file exists
        if not os.path.exists(input_path):
            print(f"Error: Input file {input_path} does not exist")
            return False
        
        print(f"Processing image: {input_path}")
        
        # Create output directory if it doesn't exist
        output_dir = os.path.dirname(output_path)
        print(f"Debug: Creating output directory: {output_dir}")
        os.makedirs(output_dir, exist_ok=True)
        
        # Load the image with OpenCV to get dimensions
        print(f"Debug: Loading image with OpenCV")
        img = cv2.imread(input_path)
        if img is None:
            print(f"Error: Could not load image {input_path}")
            return False
        
        print(f"Original image shape: {img.shape}")
        
        # Apply ESRGAN upscaling if enabled
        if options.get('upscale', True):
            print("Applying ESRGAN upscaling...")
            
            # Path to the ESRGAN executable
            current_dir = os.path.dirname(os.path.abspath(__file__))
            esrgan_dir = os.path.join(current_dir, "ESRGAN")
            print(f"Debug: ESRGAN directory: {esrgan_dir}")
            
            # Get absolute paths for input and output
            abs_input_path = os.path.abspath(input_path)
            abs_output_path = os.path.abspath(output_path)
            print(f"Debug: Absolute input path: {abs_input_path}")
            print(f"Debug: Absolute output path: {abs_output_path}")
            
            # Fixed scale factor of 4x
            scale = 4
                
            # Try to use ESRGAN for upscaling
            try:
                # Check if the image is anime/cartoon-like
                is_anime = False
                try:
                    # Simple heuristic: anime images often have fewer colors and more flat areas
                    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                    edges = cv2.Canny(gray, 100, 200)
                    edge_ratio = np.count_nonzero(edges) / edges.size
                    
                    if edge_ratio < 0.05:  # Low edge ratio often indicates anime/cartoon
                        is_anime = True
                        print(f"Detected anime/cartoon image (edge ratio: {edge_ratio:.4f})")
                except Exception as e:
                    print(f"Error detecting image type: {e}")
                
                # Select model based on image type
                if is_anime:
                    model = "realesrgan-x4plus-anime"  # Anime-optimized model
                else:
                    model = "realesrgan-x4plus"  # Standard high-quality model
                
                # Build the command
                cmd = [
                    "./realesrgan-ncnn-vulkan",
                    "-i", abs_input_path,
                    "-o", abs_output_path,
                    "-s", str(scale),
                    "-n", model
                ]
                
                print(f"Debug: ESRGAN command: {' '.join(cmd)}")
                
                # Save current directory
                original_dir = os.getcwd()
                print(f"Debug: Original directory: {original_dir}")
                
                # Change to ESRGAN directory
                os.chdir(esrgan_dir)
                print(f"Debug: Changed to ESRGAN directory: {os.getcwd()}")
                
                # Check if the executable exists and is executable
                executable_path = "./realesrgan-ncnn-vulkan"
                print(f"Debug: Checking if executable exists: {os.path.exists(executable_path)}")
                if os.path.exists(executable_path):
                    print(f"Debug: Executable permissions: {oct(os.stat(executable_path).st_mode)}")
                
                # Run the command
                print(f"Debug: Running subprocess with command: {' '.join(cmd)}")
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
                print(f"Debug: Subprocess completed with return code: {result.returncode}")
                
                # Change back to original directory
                os.chdir(original_dir)
                print(f"Debug: Changed back to original directory: {os.getcwd()}")
                
                if result.returncode == 0 and os.path.exists(output_path):
                    print(f"ESRGAN upscaling successful: {output_path}")
                    print(f"Debug: Output file exists: {os.path.exists(output_path)}")
                    print(f"Debug: Output file size: {os.path.getsize(output_path) if os.path.exists(output_path) else 'N/A'}")
                    return True
                else:
                    print(f"ESRGAN upscaling failed with code {result.returncode}")
                    print(f"Debug: Output file exists: {os.path.exists(output_path)}")
                    if result.stdout:
                        print(f"STDOUT: {result.stdout}")
                    if result.stderr:
                        print(f"STDERR: {result.stderr}")
                    return False
            except subprocess.TimeoutExpired:
                print("ESRGAN upscaling timed out after 60 seconds")
                return False
            except Exception as e:
                print(f"Error using ESRGAN: {e}")
                return False
        else:
            # If upscaling is disabled, just copy the original image
            shutil.copy(input_path, output_path)
            print(f"Upscaling disabled, copied original image to {output_path}")
            return True
            
    except Exception as e:
        print(f"Error enhancing image: {e}")
        return False

def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Enhance an image using ESRGAN')
    parser.add_argument('--input', type=str, required=True, help='Input image path')
    parser.add_argument('--output', type=str, required=True, help='Output image path')
    
    # Feature flags with explicit enable/disable options
    parser.add_argument('--upscale', action='store_true', dest='upscale', default=True, help='Apply ESRGAN upscaling')
    parser.add_argument('--no-upscale', action='store_false', dest='upscale', help='Disable ESRGAN upscaling')
    
    return parser.parse_args()

if __name__ == "__main__":
    args = parse_args()
    
    options = {
        'upscale': args.upscale,
    }
    
    success = enhance_image(args.input, args.output, options)
    if success:
        print("Image enhancement completed successfully!")
    else:
        print("Image enhancement failed.")
        sys.exit(1) 