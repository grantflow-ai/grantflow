"""
Unit tests for BioGPT Evaluator Module

This module tests the BioGPT evaluator functionality including:
- Model loading and initialization
- Perplexity calculation
- Text quality evaluation
- Error handling and edge cases
- Performance metrics
"""

from typing import Any
from unittest.mock import Mock, patch

import pytest
import torch

from services.rag.src.utils.biogpt_evaluator import (
    ACCEPTABLE_PERPLEXITY_THRESHOLD,
    BIOGPT_MODEL_NAME,
    EXCELLENT_PERPLEXITY_THRESHOLD,
    GOOD_PERPLEXITY_THRESHOLD,
    BioGPTEvaluator,
    calculate_biogpt_perplexity,
    evaluate_biomedical_text_quality,
    get_biogpt_evaluator,
    load_biogpt_model,
)


class TestBioGPTEvaluator:
    """Test cases for BioGPTEvaluator class."""

    @pytest.fixture
    def mock_model(self) -> Mock:
        """Create a mock BioGPT model."""
        model = Mock()
        model.eval.return_value = None
        # Fix the parameters mock to return an iterator
        model.parameters.return_value = iter([torch.tensor([1.0])])
        model.return_value.loss = torch.tensor(0.5)
        return model

    @pytest.fixture
    def mock_tokenizer(self) -> Mock:
        """Create a mock tokenizer."""
        tokenizer = Mock()
        tokenizer.pad_token = None
        tokenizer.eos_token = "<eos>"
        tokenizer.return_value = {
            "input_ids": torch.tensor([[1, 2, 3, 4, 5]]),
            "attention_mask": torch.tensor([[1, 1, 1, 1, 1]]),
        }
        return tokenizer

    @pytest.fixture
    def sample_biomedical_text(self) -> str:
        """Sample biomedical text for testing."""
        return """
        The study investigated the role of CRISPR-Cas9 gene editing technology
        in treating genetic disorders. Results showed significant improvement
        in target gene expression levels, with minimal off-target effects
        observed in the experimental group.
        """

    def test_initialization(self) -> None:
        """Test BioGPTEvaluator initialization."""
        evaluator = BioGPTEvaluator()
        assert evaluator.model is None
        assert evaluator.tokenizer is None
        assert not evaluator._is_loaded
        assert evaluator._load_time is None

    def test_initialization_with_model_path(self) -> None:
        """Test BioGPTEvaluator initialization with custom model path."""
        model_path = "/path/to/model"
        evaluator = BioGPTEvaluator(model_path)
        assert evaluator.model_path == model_path

    @patch("services.rag.src.utils.biogpt_evaluator.AutoTokenizer")
    @patch("services.rag.src.utils.biogpt_evaluator.AutoModelForCausalLM")
    @patch("services.rag.src.utils.biogpt_evaluator.torch")
    def test_load_model_success(
        self,
        mock_torch: Mock,
        mock_model_class: Mock,
        mock_tokenizer_class: Mock,
        mock_tokenizer: Mock,
        mock_model: Mock,
    ) -> None:
        """Test successful model loading."""
        # Setup mocks
        mock_torch.cuda.is_available.return_value = False
        mock_torch.float32 = torch.float32
        mock_tokenizer_class.from_pretrained.return_value = mock_tokenizer
        mock_model_class.from_pretrained.return_value = mock_model

        evaluator = BioGPTEvaluator()
        result = evaluator.load_model()

        assert result is True
        assert evaluator._is_loaded is True
        assert evaluator.model is not None
        assert evaluator.tokenizer is not None
        assert evaluator._load_time is not None

        # Verify tokenizer setup
        mock_tokenizer_class.from_pretrained.assert_called_once_with(
            BIOGPT_MODEL_NAME, cache_dir=None, trust_remote_code=True
        )

        # Verify model setup
        mock_model_class.from_pretrained.assert_called_once_with(
            BIOGPT_MODEL_NAME, cache_dir=None, torch_dtype=torch.float32, device_map=None, trust_remote_code=True
        )

        # Verify model is set to eval mode
        mock_model.eval.assert_called_once()

    @patch("services.rag.src.utils.biogpt_evaluator.AutoTokenizer")
    def test_load_model_failure(self, mock_tokenizer_class: Mock) -> None:
        """Test model loading failure."""
        mock_tokenizer_class.from_pretrained.side_effect = Exception("Model not found")

        evaluator = BioGPTEvaluator()
        result = evaluator.load_model()

        assert result is False
        assert evaluator._is_loaded is False
        assert evaluator.model is None
        assert evaluator.tokenizer is None

    def test_is_model_loaded_false(self) -> None:
        """Test is_model_loaded when model is not loaded."""
        evaluator = BioGPTEvaluator()
        assert evaluator.is_model_loaded() is False

    def test_is_model_loaded_true(self, mock_model: Mock, mock_tokenizer: Mock) -> None:
        """Test is_model_loaded when model is loaded."""
        evaluator = BioGPTEvaluator()
        evaluator.model = mock_model
        evaluator.tokenizer = mock_tokenizer
        evaluator._is_loaded = True

        assert evaluator.is_model_loaded() is True

    def test_calculate_perplexity_model_not_loaded(self) -> None:
        """Test perplexity calculation when model is not loaded."""
        evaluator = BioGPTEvaluator()

        with pytest.raises(Exception, match="BioGPT model is not loaded"):
            evaluator.calculate_perplexity("test text")

    def test_calculate_perplexity_empty_text(self, mock_model: Mock, mock_tokenizer: Mock) -> None:
        """Test perplexity calculation with empty text."""
        evaluator = BioGPTEvaluator()
        evaluator.model = mock_model
        evaluator.tokenizer = mock_tokenizer
        evaluator._is_loaded = True

        result = evaluator.calculate_perplexity("")
        assert result == float("inf")

    @patch("services.rag.src.utils.biogpt_evaluator.torch")
    def test_calculate_perplexity_success(self, mock_torch: Mock, mock_model: Mock, mock_tokenizer: Mock) -> None:
        """Test successful perplexity calculation."""
        # Setup mocks
        mock_torch.exp.return_value = torch.tensor(1.5)
        mock_torch.no_grad.return_value.__enter__ = Mock()
        mock_torch.no_grad.return_value.__exit__ = Mock()

        # Setup model mock
        mock_model.parameters.return_value = iter([torch.tensor([1.0])])
        mock_output = Mock()
        mock_output.loss = torch.tensor(0.4)
        mock_model.return_value = mock_output

        # Setup tokenizer mock
        mock_tokenizer.return_value = {
            "input_ids": torch.tensor([[1, 2, 3, 4, 5]]),
            "attention_mask": torch.tensor([[1, 1, 1, 1, 1]]),
        }

        evaluator = BioGPTEvaluator()
        evaluator.model = mock_model
        evaluator.tokenizer = mock_tokenizer
        evaluator._is_loaded = True

        result = evaluator.calculate_perplexity("test biomedical text")

        assert result == 1.5
        mock_tokenizer.assert_called_once()
        mock_model.assert_called_once()

    def test_evaluate_text_quality_excellent(self, mock_model: Mock, mock_tokenizer: Mock) -> None:
        """Test text quality evaluation with excellent perplexity."""
        # Setup mocks for excellent perplexity
        with patch.object(BioGPTEvaluator, "calculate_perplexity", return_value=EXCELLENT_PERPLEXITY_THRESHOLD - 1):
            evaluator = BioGPTEvaluator()
            evaluator.model = mock_model
            evaluator.tokenizer = mock_tokenizer
            evaluator._is_loaded = True

            result = evaluator.evaluate_text_quality("excellent biomedical text")

            assert result["quality_level"] == "excellent"
            assert result["quality_score"] == 95
            assert result["perplexity"] < EXCELLENT_PERPLEXITY_THRESHOLD

    def test_evaluate_text_quality_good(self, mock_model: Mock, mock_tokenizer: Mock) -> None:
        """Test text quality evaluation with good perplexity."""
        # Setup mocks for good perplexity
        with patch.object(BioGPTEvaluator, "calculate_perplexity", return_value=GOOD_PERPLEXITY_THRESHOLD - 1):
            evaluator = BioGPTEvaluator()
            evaluator.model = mock_model
            evaluator.tokenizer = mock_tokenizer
            evaluator._is_loaded = True

            result = evaluator.evaluate_text_quality("good biomedical text")

            assert result["quality_level"] == "good"
            assert result["quality_score"] == 80
            assert result["perplexity"] < GOOD_PERPLEXITY_THRESHOLD

    def test_evaluate_text_quality_acceptable(self, mock_model: Mock, mock_tokenizer: Mock) -> None:
        """Test text quality evaluation with acceptable perplexity."""
        # Setup mocks for acceptable perplexity
        with patch.object(BioGPTEvaluator, "calculate_perplexity", return_value=ACCEPTABLE_PERPLEXITY_THRESHOLD - 1):
            evaluator = BioGPTEvaluator()
            evaluator.model = mock_model
            evaluator.tokenizer = mock_tokenizer
            evaluator._is_loaded = True

            result = evaluator.evaluate_text_quality("acceptable biomedical text")

            assert result["quality_level"] == "acceptable"
            assert result["quality_score"] == 65
            assert result["perplexity"] < ACCEPTABLE_PERPLEXITY_THRESHOLD

    def test_evaluate_text_quality_poor(self, mock_model: Mock, mock_tokenizer: Mock) -> None:
        """Test text quality evaluation with poor perplexity."""
        # Setup mocks for poor perplexity
        with patch.object(BioGPTEvaluator, "calculate_perplexity", return_value=ACCEPTABLE_PERPLEXITY_THRESHOLD + 10):
            evaluator = BioGPTEvaluator()
            evaluator.model = mock_model
            evaluator.tokenizer = mock_tokenizer
            evaluator._is_loaded = True

            result = evaluator.evaluate_text_quality("poor biomedical text")

            assert result["quality_level"] == "poor"
            assert result["quality_score"] == 40
            assert result["perplexity"] > ACCEPTABLE_PERPLEXITY_THRESHOLD

    def test_batch_evaluate_texts(self, mock_model: Mock, mock_tokenizer: Mock) -> None:
        """Test batch evaluation of multiple texts."""
        texts = ["text 1", "text 2", "text 3"]

        with patch.object(BioGPTEvaluator, "evaluate_text_quality") as mock_evaluate:
            mock_evaluate.side_effect = [
                {"perplexity": 25.0, "quality_level": "excellent", "quality_score": 95},
                {"perplexity": 45.0, "quality_level": "good", "quality_score": 80},
                {"perplexity": 70.0, "quality_level": "acceptable", "quality_score": 65},
            ]

            evaluator = BioGPTEvaluator()
            evaluator.model = mock_model
            evaluator.tokenizer = mock_tokenizer
            evaluator._is_loaded = True

            results = evaluator.batch_evaluate_texts(texts)

            assert len(results) == 3
            assert results[0]["text_index"] == 0
            assert results[1]["text_index"] == 1
            assert results[2]["text_index"] == 2
            assert mock_evaluate.call_count == 3

    def test_batch_evaluate_texts_with_errors(self, mock_model: Mock, mock_tokenizer: Mock) -> None:
        """Test batch evaluation with some errors."""
        texts = ["text 1", "text 2", "text 3"]

        with patch.object(BioGPTEvaluator, "evaluate_text_quality") as mock_evaluate:
            mock_evaluate.side_effect = [
                {"perplexity": 25.0, "quality_level": "excellent", "quality_score": 95},
                Exception("Evaluation failed"),
                {"perplexity": 70.0, "quality_level": "acceptable", "quality_score": 65},
            ]

            evaluator = BioGPTEvaluator()
            evaluator.model = mock_model
            evaluator.tokenizer = mock_tokenizer
            evaluator._is_loaded = True

            results = evaluator.batch_evaluate_texts(texts)

            assert len(results) == 3
            assert results[0]["quality_level"] == "excellent"
            assert results[1]["quality_level"] == "error"
            assert results[1]["error"] == "Evaluation failed"
            assert results[2]["quality_level"] == "acceptable"

    def test_get_model_info_not_loaded(self) -> None:
        """Test get_model_info when model is not loaded."""
        evaluator = BioGPTEvaluator()
        info = evaluator.get_model_info()

        assert info["status"] == "not_loaded"

    def test_get_model_info_loaded(self, mock_model: Mock, mock_tokenizer: Mock) -> None:
        """Test get_model_info when model is loaded."""
        evaluator = BioGPTEvaluator()
        evaluator.model = mock_model
        evaluator.tokenizer = mock_tokenizer
        evaluator._is_loaded = True
        evaluator._load_time = 2.5

        # Create a list of mock tensors to simulate multiple parameter calls
        mock_tensors = [torch.tensor([1.0, 2.0, 3.0]), torch.tensor([4.0, 5.0, 6.0])]

        # Replace parameters method with a method that returns a new iterator each time
        def mock_parameters() -> Any:
            return iter(mock_tensors)

        mock_model.parameters = mock_parameters

        info = evaluator.get_model_info()

        assert info["status"] == "loaded"
        assert info["model_name"] == BIOGPT_MODEL_NAME
        assert info["load_time_seconds"] == 2.5
        assert info["parameters"] == 6  # 3 elements in the first tensor + 3 in the second

    def test_unload_model(self, mock_model: Mock, mock_tokenizer: Mock) -> None:
        """Test model unloading."""
        evaluator = BioGPTEvaluator()
        evaluator.model = mock_model
        evaluator.tokenizer = mock_tokenizer
        evaluator._is_loaded = True
        evaluator._load_time = 2.5

        evaluator.unload_model()

        assert evaluator.model is None
        assert evaluator.tokenizer is None
        assert evaluator._is_loaded is False
        assert evaluator._load_time is None


class TestGlobalFunctions:
    """Test cases for global functions."""

    def test_get_biogpt_evaluator_singleton(self) -> None:
        """Test that get_biogpt_evaluator returns the same instance."""
        evaluator1 = get_biogpt_evaluator()
        evaluator2 = get_biogpt_evaluator()

        assert evaluator1 is evaluator2

    def test_get_biogpt_evaluator_with_path(self) -> None:
        """Test get_biogpt_evaluator with custom model path."""
        model_path = "/custom/path"
        evaluator = get_biogpt_evaluator(model_path)

        assert evaluator.model_path == model_path

    @patch("services.rag.src.utils.biogpt_evaluator.get_biogpt_evaluator")
    def test_load_biogpt_model(self, mock_get_evaluator: Mock) -> None:
        """Test load_biogpt_model function."""
        mock_evaluator = Mock()
        mock_evaluator.load_model.return_value = True
        mock_get_evaluator.return_value = mock_evaluator

        result = load_biogpt_model("/test/path")

        assert result is True
        mock_get_evaluator.assert_called_once_with("/test/path")
        mock_evaluator.load_model.assert_called_once()

    @patch("services.rag.src.utils.biogpt_evaluator.get_biogpt_evaluator")
    def test_calculate_biogpt_perplexity(self, mock_get_evaluator: Mock) -> None:
        """Test calculate_biogpt_perplexity function."""
        mock_evaluator = Mock()
        mock_evaluator.calculate_perplexity.return_value = 25.5
        mock_get_evaluator.return_value = mock_evaluator

        result = calculate_biogpt_perplexity("test text")

        assert result == 25.5
        mock_evaluator.calculate_perplexity.assert_called_once_with("test text")

    @patch("services.rag.src.utils.biogpt_evaluator.get_biogpt_evaluator")
    def test_evaluate_biomedical_text_quality(self, mock_get_evaluator: Mock) -> None:
        """Test evaluate_biomedical_text_quality function."""
        mock_evaluator = Mock()
        expected_result = {"perplexity": 25.0, "quality_level": "excellent", "quality_score": 95}
        mock_evaluator.evaluate_text_quality.return_value = expected_result
        mock_get_evaluator.return_value = mock_evaluator

        result = evaluate_biomedical_text_quality("test biomedical text")

        assert result == expected_result
        mock_evaluator.evaluate_text_quality.assert_called_once_with("test biomedical text")
