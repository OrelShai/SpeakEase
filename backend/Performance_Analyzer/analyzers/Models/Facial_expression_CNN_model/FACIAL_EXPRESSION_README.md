# Facial Expression Recognition CNN Model

## Overview

This facial expression recognition system is based on a project I learned from and adapted for the SpeakEase Performance Analyzer. The system uses a Convolutional Neural Network (CNN) to detect and classify facial emotions from a video.

## What I Learned

I studied an existing facial expression recognition project and learned how to:
- Build CNN models for image classification
- Process the FER-2013 dataset
- Handle imbalanced datasets using oversampling
- Implement real-time face detection with OpenCV
- Integrate deep learning models into larger applications

## Model Details

- **Dataset**: FER-2013 (48x48 grayscale face images)
- **Emotions**: 7 classes (angry, disgust, fear, happy, sad, surprise, neutral)
- **Architecture**: 5-layer CNN with BatchNormalization and Dropout
- **Accuracy**: ~81% on test data
- **Framework**: TensorFlow/Keras

## Files

- `fer.h5` - model weights after taining
- `Facial Expression Recognition.json` - Model architecture
- `haarcascade_frontalface_default.xml` - Face detection classifier
- `Real-Time Facial Expression Detection & Recognition using CNN.ipynb` - Training notebook

## How It Works

1. **Face Detection**: Uses Haar Cascade to detect faces in video frames
2. **Preprocessing**: Converts detected faces to 48x48 grayscale images
3. **Prediction**: CNN model predicts emotion from processed face images
4. **Integration**: Results are fed into the SpeakEase performance analysis system

## Model Architecture

```
Input (48x48x1) → Conv2D (32) → BatchNorm → ReLU → Dropout
                ↓
Conv2D (64) → BatchNorm → ReLU → MaxPool2D
                ↓
Conv2D (64) → BatchNorm → ReLU → Dropout
                ↓
Conv2D (128) → BatchNorm → ReLU → MaxPool2D
                ↓
Conv2D (128) → BatchNorm → ReLU → MaxPool2D
                ↓
Flatten → Dense (250) → Dropout → Dense (7) → Softmax
```

### Layer-by-Layer Breakdown:

**Input Layer (48x48x1)**
- Accepts grayscale face images of 48x48 pixels
- Single channel (grayscale) hence depth = 1

**1st Convolutional Block**
- **Conv2D (32)**: 32 filters with 3x3 kernel, extracts basic features like edges
- **BatchNorm**: Normalizes inputs to stabilize training
- **ReLU**: Activation function, introduces non-linearity
- **Dropout (0.25)**: Randomly drops 25% of neurons to prevent overfitting

**2nd Convolutional Block**
- **Conv2D (64)**: 64 filters, learns more complex patterns
- **BatchNorm**: Stabilizes learning
- **ReLU**: Non-linear activation
- **MaxPool2D (2x2)**: Reduces spatial dimensions by half, keeps important features

**3rd Convolutional Block**
- **Conv2D (64)**: 64 filters, deepens feature extraction
- **BatchNorm**: Normalizes activations
- **ReLU**: Activation function
- **Dropout (0.25)**: Regularization to prevent overfitting

**4th Convolutional Block**
- **Conv2D (128)**: 128 filters, captures high-level features
- **BatchNorm**: Stabilizes training
- **ReLU**: Non-linear activation
- **MaxPool2D (2x2)**: Further spatial reduction

**5th Convolutional Block**
- **Conv2D (128)**: 128 filters, final feature extraction
- **BatchNorm**: Normalizes inputs
- **ReLU**: Activation function
- **MaxPool2D (2x2)**: Final spatial reduction

**Fully Connected Layers**
- **Flatten**: Converts 2D feature maps to 1D vector
- **Dense (250)**: Fully connected layer with 250 neurons
- **Dropout (0.5)**: High dropout rate for regularization
- **Dense (7)**: Output layer with 7 neurons (one per emotion)
- **Softmax**: Converts outputs to probabilities that sum to 1

### Key Design Principles:
- **Progressive Feature Learning**: Filters increase from 32→64→128, learning from simple to complex features
- **Regularization**: BatchNorm and Dropout prevent overfitting
- **Spatial Reduction**: MaxPooling reduces computational load while preserving important features
- **Multi-Class Classification**: Softmax output provides probability distribution over 7 emotions

## Usage in SpeakEase

The model is integrated into the Performance Analyzer to provide emotional analysis of video presentations, helping users understand the emotional impact of their communication.

## Dependencies

- TensorFlow/Keras
- OpenCV
- NumPy
- Pandas
- Scikit-learn

## Credit

This implementation is based on learning from existing facial expression recognition projects and adapting the concepts
https://github.com/shivamsingh96/Facial-Expression-Detection-using-CNN-Real-Time-Recognition-with-Webcam
