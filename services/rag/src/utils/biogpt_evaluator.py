"""
BioGPT Evaluator Module

This module provides BioGPT-based evaluation capabilities for biomedical text quality assessment.
It includes model loading, perplexity calculation, and comprehensive evaluation metrics.

Key features:
1. Efficient model loading and caching
2. Perplexity calculation for biomedical text
3. Quality assessment based on domain-specific criteria
4. Performance optimization and error handling
5. Comprehensive logging and monitoring
"""

import time
from typing import Any, Final

import torch
from packages.shared_utils.src.exceptions import BackendError
from packages.shared_utils.src.logger import get_logger
from transformers import AutoModelForCausalLM, AutoTokenizer
from typing import cast

logger = get_logger(__name__)

# Model configuration
BIOGPT_MODEL_NAME: Final[str] = "microsoft/biogpt"
DEFAULT_MAX_LENGTH: Final[int] = 512
DEFAULT_BATCH_SIZE: Final[int] = 1

# Quality thresholds
EXCELLENT_PERPLEXITY_THRESHOLD: Final[float] = 30.0
GOOD_PERPLEXITY_THRESHOLD: Final[float] = 50.0
ACCEPTABLE_PERPLEXITY_THRESHOLD: Final[float] = 80.0

# Error messages
MODEL_LOAD_ERROR_MSG: Final[str] = "Failed to load BioGPT model"
TOKENIZATION_ERROR_MSG: Final[str] = "Failed to tokenize text for perplexity calculation"
INFERENCE_ERROR_MSG: Final[str] = "Failed to perform inference with BioGPT model"


class BioGPTEvaluator:
    """
    BioGPT-based evaluator for biomedical text quality assessment.

    This class provides methods to:
    - Load and manage the BioGPT model
    - Calculate perplexity scores for biomedical text
    - Assess text quality based on domain-specific criteria
    - Provide detailed evaluation reports
    """

    def __init__(self, model_path: str | None = None) -> None:
        """
        Initialize the BioGPT evaluator.

        Args:
            model_path: Optional path to local model files. If None, downloads from HuggingFace.
        """
        self.model_path = model_path
        self.model: AutoModelForCausalLM | None = None
        self.tokenizer: AutoTokenizer | None = None
        self._is_loaded = False
        self._load_time: float | None = None

    def load_model(self) -> bool:
        """
        Load the BioGPT model and tokenizer.

        Returns:
            True if model loaded successfully, False otherwise.
        """
        if self._is_loaded and self.model is not None and self.tokenizer is not None:
            logger.info("BioGPT model already loaded")
            return True

        try:
            start_time = time.time()
            logger.info("Loading BioGPT model", model_name=BIOGPT_MODEL_NAME)

            # Load tokenizer
            self.tokenizer = AutoTokenizer.from_pretrained(
                BIOGPT_MODEL_NAME,
                cache_dir=self.model_path,
                trust_remote_code=True
            )

            # Set pad token if it doesn't exist
            if self.tokenizer.pad_token is None:
                self.tokenizer.pad_token = self.tokenizer.eos_token

            # Load model
            self.model = AutoModelForCausalLM.from_pretrained(
                BIOGPT_MODEL_NAME,
                cache_dir=self.model_path,
                torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
                device_map="auto" if torch.cuda.is_available() else None,
                trust_remote_code=True
            )

            # Set model to evaluation mode
            self.model.eval()

            self._is_loaded = True
            self._load_time = time.time() - start_time

            logger.info("BioGPT model loaded successfully", load_time_seconds=self._load_time)
            return True

        except Exception as e:
            logger.error(f"❌ {MODEL_LOAD_ERROR_MSG}: {e!s}")
            self._is_loaded = False
            return False

    def is_model_loaded(self) -> bool:
        """Check if the model is loaded and ready for inference."""
        return self._is_loaded and self.model is not None and self.tokenizer is not None

    def calculate_perplexity(self, text: str, max_length: int = DEFAULT_MAX_LENGTH) -> float:
        """
        Calculate perplexity score for given biomedical text.

        Args:
            text: The biomedical text to evaluate
            max_length: Maximum sequence length for tokenization

        Returns:
            Perplexity score (lower is better)

        Raises:
            BackendError: If model is not loaded or inference fails
        """
        if not self.is_model_loaded():
            raise BackendError("BioGPT model is not loaded. Call load_model() first.")

        if not text.strip():
            logger.warning("Empty text provided for perplexity calculation")
            return float("inf")

        try:
            # Tokenize the text
            inputs = self.tokenizer(
                text,
                return_tensors="pt",
                padding=True,
                truncation=True,
                max_length=max_length
            )

            # Move inputs to the same device as model
            device = next(self.model.parameters()).device
            inputs = {k: v.to(device) for k, v in inputs.items()}

            # Calculate loss
            with torch.no_grad():
                outputs = self.model(**inputs, labels=inputs["input_ids"])
                loss = outputs.loss

            # Calculate perplexity
            perplexity = torch.exp(loss).item()

            logger.debug(f"Perplexity calculated: {perplexity:.4f} for text length: {len(text)}")
            return perplexity

        except Exception as e:
            logger.error(f"❌ {INFERENCE_ERROR_MSG}: {e!s}")
            raise BackendError(f"Failed to calculate perplexity: {e!s}") from e

    def evaluate_text_quality(self, text: str) -> dict[str, Any]:
        """
        Evaluate biomedical text quality using multiple metrics.

        Args:
            text: The biomedical text to evaluate

        Returns:
            Dictionary containing evaluation results
        """
        if not self.is_model_loaded():
            raise BackendError("BioGPT model is not loaded. Call load_model() first.")

        start_time = time.time()

        try:
            # Calculate perplexity
            perplexity = self.calculate_perplexity(text)

            # Determine quality level
            if perplexity <= EXCELLENT_PERPLEXITY_THRESHOLD:
                quality_level = "excellent"
                quality_score = 95
            elif perplexity <= GOOD_PERPLEXITY_THRESHOLD:
                quality_level = "good"
                quality_score = 80
            elif perplexity <= ACCEPTABLE_PERPLEXITY_THRESHOLD:
                quality_level = "acceptable"
                quality_score = 65
            else:
                quality_level = "poor"
                quality_score = 40

            # Calculate additional metrics
            word_count = len(text.split())
            char_count = len(text)

            evaluation_time = time.time() - start_time

            result = {
                "perplexity": perplexity,
                "quality_level": quality_level,
                "quality_score": quality_score,
                "word_count": word_count,
                "char_count": char_count,
                "evaluation_time_seconds": evaluation_time,
                "model_used": BIOGPT_MODEL_NAME,
                "thresholds": {
                    "excellent": EXCELLENT_PERPLEXITY_THRESHOLD,
                    "good": GOOD_PERPLEXITY_THRESHOLD,
                    "acceptable": ACCEPTABLE_PERPLEXITY_THRESHOLD
                }
            }

            logger.info(f"Text quality evaluation completed: {quality_level} (score: {quality_score})")
            return result

        except Exception as e:
            logger.error(f"Failed to evaluate text quality: {e!s}")
            raise BackendError(f"Text quality evaluation failed: {e!s}") from e

    def batch_evaluate_texts(self, texts: list[str]) -> list[dict[str, Any]]:
        """
        Evaluate multiple biomedical texts in batch.

        Args:
            texts: List of biomedical texts to evaluate

        Returns:
            List of evaluation results for each text
        """
        if not self.is_model_loaded():
            raise BackendError("BioGPT model is not loaded. Call load_model() first.")

        results = []
        total_start_time = time.time()

        for i, text in enumerate(texts):
            try:
                logger.debug(f"Evaluating text {i+1}/{len(texts)}")
                result = self.evaluate_text_quality(text)
                result["text_index"] = i
                results.append(result)
            except Exception as e:
                logger.error(f"Failed to evaluate text {i+1}: {e!s}")
                results.append({
                    "text_index": i,
                    "error": str(e),
                    "perplexity": float("inf"),
                    "quality_level": "error",
                    "quality_score": 0
                })

        total_time = time.time() - total_start_time
        logger.info(f"Batch evaluation completed: {len(texts)} texts in {total_time:.2f}s")

        return results

    def get_model_info(self) -> dict[str, Any]:
        """Get information about the loaded model."""
        if not self.is_model_loaded():
            return {"status": "not_loaded"}

        return {
            "status": "loaded",
            "model_name": BIOGPT_MODEL_NAME,
            "model_path": self.model_path,
            "load_time_seconds": self._load_time,
            "device": str(next(self.model.parameters()).device),
            "dtype": str(next(self.model.parameters()).dtype),
            "parameters": sum(p.numel() for p in self.model.parameters()),
            "trainable_parameters": sum(p.numel() for p in self.model.parameters() if p.requires_grad)
        }

    def unload_model(self) -> None:
        """Unload the model to free memory."""
        if self.model is not None:
            del self.model
            self.model = None

        if self.tokenizer is not None:
            del self.tokenizer
            self.tokenizer = None

        self._is_loaded = False
        self._load_time = None

        # Force garbage collection
        import gc
        gc.collect()

        if torch.cuda.is_available():
            torch.cuda.empty_cache()

        logger.info("BioGPT model unloaded and memory freed")


# Global instance for singleton pattern
_biogpt_evaluator: BioGPTEvaluator | None = None


def get_biogpt_evaluator(model_path: str | None = None) -> BioGPTEvaluator:
    """
    Get or create a global BioGPT evaluator instance.

    Args:
        model_path: Optional path to local model files

    Returns:
        BioGPTEvaluator instance
    """
    global _biogpt_evaluator

    if _biogpt_evaluator is None:
        _biogpt_evaluator = BioGPTEvaluator(model_path)
    elif model_path is not None and _biogpt_evaluator.model_path != model_path:
        # Update model path if different from current
        _biogpt_evaluator.model_path = model_path

    return _biogpt_evaluator


def load_biogpt_model(model_path: str | None = None) -> bool:
    """
    Load the BioGPT model globally.

    Args:
        model_path: Optional path to local model files

    Returns:
        True if model loaded successfully, False otherwise
    """
    evaluator = get_biogpt_evaluator(model_path)
    return evaluator.load_model()


def calculate_biogpt_perplexity(text: str) -> float:
    """
    Calculate perplexity for biomedical text using the global BioGPT model.

    Args:
        text: The biomedical text to evaluate

    Returns:
        Perplexity score
    """
    evaluator = get_biogpt_evaluator()
    return evaluator.calculate_perplexity(text)


def evaluate_biomedical_text_quality(text: str) -> dict[str, Any]:
    """
    Evaluate biomedical text quality using the global BioGPT model.

    Args:
        text: The biomedical text to evaluate

    Returns:
        Evaluation results dictionary
    """
    evaluator = get_biogpt_evaluator()
    return evaluator.evaluate_text_quality(text)
