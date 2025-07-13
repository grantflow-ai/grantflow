"""
Real BioGPT Model Tests

These tests use the actual BioGPT model to verify real functionality.
They are slower but provide actual validation of the model behavior.

Run these tests when you want to verify the real model works:
    pytest services/rag/tests/unit/test_biogpt_evaluator_real.py -v -s
"""

import pytest
import time
from pathlib import Path

from services.rag.src.utils.biogpt_evaluator import (
    BioGPTEvaluator,
    get_biogpt_evaluator,
    calculate_biogpt_perplexity,
    evaluate_biomedical_text_quality,
)


class TestRealBioGPTModel:
    """Tests using the actual BioGPT model."""
    
    @pytest.fixture(scope="class")
    def real_evaluator(self):
        """Create a real BioGPT evaluator with the local model."""
        model_path = "/Users/yiftachashkenazi/Downloads/forgrantflow/models--microsoft--biogpt"
        
        # Check if model exists
        if not Path(model_path).exists():
            pytest.skip(f"Real BioGPT model not found at {model_path}")
        
        evaluator = BioGPTEvaluator(model_path=model_path)
        return evaluator
    
    def test_real_model_loading(self, real_evaluator):
        """Test loading the real BioGPT model."""
        print(f"\n🔄 Loading real BioGPT model from: {real_evaluator.model_path}")
        start_time = time.time()
        
        success = real_evaluator.load_model()
        load_time = time.time() - start_time
        
        assert success is True
        assert real_evaluator.is_model_loaded() is True
        print(f"✅ Model loaded successfully in {load_time:.2f} seconds")
        
        # Get model info
        info = real_evaluator.get_model_info()
        print(f"📊 Model info: {info}")
        
        assert info["status"] == "loaded"
        assert info["model_name"] == "microsoft/biogpt"
        assert info["parameters"] > 1000000  # Should have millions of parameters
    
    def test_real_perplexity_calculation(self, real_evaluator):
        """Test perplexity calculation with real model."""
        if not real_evaluator.is_model_loaded():
            real_evaluator.load_model()
        
        # Real biomedical text
        biomedical_text = """
        The study investigated the role of CRISPR-Cas9 gene editing technology 
        in treating genetic disorders. Results showed significant improvement 
        in target gene expression levels, with minimal off-target effects 
        observed in the experimental group. The research demonstrated that 
        CRISPR-Cas9 can effectively modify specific DNA sequences in human cells.
        """
        
        print(f"\n🧬 Testing perplexity calculation with real biomedical text")
        print(f"Text length: {len(biomedical_text)} characters")
        
        start_time = time.time()
        perplexity = real_evaluator.calculate_perplexity(biomedical_text)
        calc_time = time.time() - start_time
        
        print(f"✅ Perplexity: {perplexity:.4f} (calculated in {calc_time:.2f}s)")
        
        # Validate realistic perplexity range for biomedical text
        assert isinstance(perplexity, float)
        assert perplexity > 0
        assert perplexity < 1000  # Should be reasonable for biomedical text
        assert 5 < perplexity < 500  # Wider range for excellent biomedical text
    
    def test_real_quality_evaluation(self, real_evaluator):
        """Test quality evaluation with real model."""
        if not real_evaluator.is_model_loaded():
            real_evaluator.load_model()
        
        # Test with different quality texts
        test_cases = [
            {
                "name": "High Quality Biomedical",
                "text": """
                The CRISPR-Cas9 system represents a revolutionary breakthrough in 
                genetic engineering, enabling precise genome editing with unprecedented 
                accuracy. This technology utilizes a guide RNA to direct the Cas9 
                endonuclease to specific DNA sequences, where it creates double-strand 
                breaks that can be repaired through various cellular mechanisms.
                """,
                "expected_quality": "excellent"
            },
            {
                "name": "Medium Quality Biomedical", 
                "text": """
                Gene therapy involves introducing genetic material into cells to 
                treat or prevent disease. This approach has shown promise in 
                treating various genetic disorders and some types of cancer.
                """,
                "expected_quality": "good"
            },
            {
                "name": "Poor Quality Text",
                "text": "This is not biomedical text at all. It's just random words.",
                "expected_quality": "poor"
            }
        ]
        
        for test_case in test_cases:
            print(f"\n🔍 Testing: {test_case['name']}")
            print(f"Text: {test_case['text'][:100]}...")
            
            start_time = time.time()
            result = real_evaluator.evaluate_text_quality(test_case['text'])
            eval_time = time.time() - start_time
            
            print(f"✅ Quality: {result['quality_level']} (score: {result['quality_score']})")
            print(f"📊 Perplexity: {result['perplexity']:.4f}")
            print(f"⏱️  Evaluation time: {eval_time:.2f}s")
            
            # Validate results
            assert result["perplexity"] > 0
            assert result["quality_level"] in ["excellent", "good", "acceptable", "poor"]
            assert 0 <= result["quality_score"] <= 100
            assert result["word_count"] > 0
            assert result["evaluation_time_seconds"] > 0
    
    def test_real_batch_evaluation(self, real_evaluator):
        """Test batch evaluation with real model."""
        if not real_evaluator.is_model_loaded():
            real_evaluator.load_model()
        
        texts = [
            "CRISPR-Cas9 is a powerful gene editing tool.",
            "The study examined protein expression in cancer cells.",
            "This is not biomedical text at all.",
            "DNA sequencing revealed novel genetic variants.",
            "The research focused on stem cell differentiation."
        ]
        
        print(f"\n📦 Testing batch evaluation with {len(texts)} texts")
        
        start_time = time.time()
        results = real_evaluator.batch_evaluate_texts(texts)
        batch_time = time.time() - start_time
        
        print(f"✅ Batch completed in {batch_time:.2f}s")
        
        assert len(results) == len(texts)
        
        for i, result in enumerate(results):
            print(f"  Text {i+1}: {result['quality_level']} (score: {result['quality_score']})")
            assert result["perplexity"] > 0
            assert result["quality_level"] in ["excellent", "good", "acceptable", "poor"]
    
    def test_real_model_performance(self, real_evaluator):
        """Test model performance characteristics."""
        if not real_evaluator.is_model_loaded():
            real_evaluator.load_model()
        
        # Test with different text lengths
        short_text = "CRISPR gene editing technology."
        medium_text = """
        The CRISPR-Cas9 system enables precise genome editing by using a guide RNA 
        to direct the Cas9 endonuclease to specific DNA sequences. This technology 
        has revolutionized genetic engineering and holds promise for treating 
        various genetic disorders.
        """
        long_text = """
        The CRISPR-Cas9 system represents a revolutionary breakthrough in genetic 
        engineering, enabling precise genome editing with unprecedented accuracy. 
        This technology utilizes a guide RNA to direct the Cas9 endonuclease to 
        specific DNA sequences, where it creates double-strand breaks that can be 
        repaired through various cellular mechanisms. The system's ability to target 
        virtually any DNA sequence has opened new possibilities for treating genetic 
        disorders, developing disease-resistant crops, and advancing basic research 
        in molecular biology. Recent studies have demonstrated its effectiveness in 
        correcting disease-causing mutations in human cells and animal models.
        """
        
        texts = [short_text, medium_text, long_text]
        names = ["Short", "Medium", "Long"]
        
        print(f"\n⚡ Performance test with different text lengths")
        
        for text, name in zip(texts, names):
            print(f"\n📏 {name} text ({len(text)} chars):")
            
            start_time = time.time()
            result = real_evaluator.evaluate_text_quality(text)
            eval_time = time.time() - start_time
            
            print(f"  Perplexity: {result['perplexity']:.4f}")
            print(f"  Quality: {result['quality_level']}")
            print(f"  Time: {eval_time:.2f}s")
            
            # Validate performance
            assert eval_time < 30  # Should complete within 30 seconds
            assert result["perplexity"] > 0
    
    def test_real_model_memory_management(self, real_evaluator):
        """Test model memory management."""
        if not real_evaluator.is_model_loaded():
            real_evaluator.load_model()
        
        print(f"\n🧠 Testing memory management")
        
        # Test multiple evaluations
        for i in range(5):
            text = f"CRISPR-Cas9 test {i+1}: Gene editing technology."
            result = real_evaluator.evaluate_text_quality(text)
            print(f"  Test {i+1}: Perplexity = {result['perplexity']:.4f}")
        
        # Test unloading
        print(f"🔄 Unloading model...")
        real_evaluator.unload_model()
        
        assert not real_evaluator.is_model_loaded()
        assert real_evaluator.model is None
        assert real_evaluator.tokenizer is None
        
        print(f"✅ Model unloaded successfully")


class TestRealBioGPTGlobalFunctions:
    """Test global functions with real model."""
    
    def test_real_global_evaluator(self):
        """Test global evaluator with real model."""
        model_path = "/Users/yiftachashkenazi/Downloads/forgrantflow/models--microsoft--biogpt"
        
        if not Path(model_path).exists():
            pytest.skip(f"Real BioGPT model not found at {model_path}")
        
        print(f"\n🌐 Testing global evaluator with real model")
        
        evaluator = get_biogpt_evaluator(model_path)
        success = evaluator.load_model()
        
        assert success is True
        assert evaluator.is_model_loaded() is True
        
        # Test global functions
        text = "CRISPR-Cas9 gene editing technology."
        
        perplexity = calculate_biogpt_perplexity(text)
        print(f"✅ Global perplexity: {perplexity:.4f}")
        assert perplexity > 0
        
        result = evaluate_biomedical_text_quality(text)
        print(f"✅ Global quality: {result['quality_level']}")
        assert result["perplexity"] == perplexity
        
        # Clean up
        evaluator.unload_model()


if __name__ == "__main__":
    # Run specific test
    pytest.main([__file__, "-v", "-s", "-k", "test_real_model_loading"]) 