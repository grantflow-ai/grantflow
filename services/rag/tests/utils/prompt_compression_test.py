from services.rag.src.utils.prompt_compression import (
    compress_prompt_text,
    compress_repetitive_phrases,
    compress_whitespace,
    estimate_compression_ratio,
    remove_stop_words,
)


class TestRemoveStopWords:
    def test_remove_basic_stop_words(self) -> None:
        text = "The research is very important for the field"
        result = remove_stop_words(text)
        # Should keep important content words but remove basic stop words
        assert "research" in result
        assert "important" in result
        assert "field" in result
        assert "the" not in result.lower()
        assert "is" not in result.lower()
        assert "very" not in result.lower()

    def test_remove_grant_specific_stop_words(self) -> None:
        text = "This approach will comprehensively address the research methodology"
        result = remove_stop_words(text)
        assert "address" in result
        assert "research" in result
        assert "methodology" in result
        assert "comprehensively" not in result
        assert "approach" not in result

    def test_preserve_scientific_terms(self) -> None:
        text = "The protein expression analysis using CRISPR methodology"
        result = remove_stop_words(text)
        assert "protein" in result
        assert "expression" in result
        assert "analysis" in result
        assert "CRISPR" in result
        assert "methodology" in result

    def test_preserve_named_entities(self) -> None:
        text = "NIH grants support Stanford University research initiatives"
        result = remove_stop_words(text)
        assert "NIH" in result
        assert "Stanford" in result
        assert "University" in result
        assert "grants" in result
        assert "research" in result

    def test_preserve_numbers_and_measurements(self) -> None:
        text = "The study involves 500 participants over 24 months with 95% confidence"
        result = remove_stop_words(text)
        assert "500" in result
        assert "24" in result
        assert "95%" in result
        assert "participants" in result
        assert "months" in result
        assert "confidence" in result

    def test_empty_text(self) -> None:
        assert remove_stop_words("") == ""
        assert remove_stop_words("   ") == ""

    def test_only_stop_words(self) -> None:
        text = "the and or but however moreover"
        result = remove_stop_words(text)
        # Should be empty or nearly empty
        assert len(result.strip()) == 0

    def test_preserve_important_pos_tags(self) -> None:
        text = "innovative methodological approaches enable comprehensive understanding"
        result = remove_stop_words(text)
        assert "innovative" in result  # ADJ (kept as scientifically meaningful)
        assert "enable" in result  # VERB
        assert "understanding" in result  # NOUN
        # methodological and comprehensive should be removed as grant stop words
        assert "methodological" not in result
        assert "comprehensive" not in result


class TestCompressRepetitivePhrases:
    def test_remove_duplicate_sentences(self) -> None:
        text = "This is important. This research matters. This is important. The work continues."
        result = compress_repetitive_phrases(text)
        sentences = result.split(". ")
        # Should only have unique sentences
        unique_sentences = {s.strip().lower() for s in sentences if s.strip()}
        assert len(unique_sentences) == len([s for s in sentences if s.strip()])

    def test_case_insensitive_deduplication(self) -> None:
        text = "This is IMPORTANT. this is important. This Is Important."
        result = compress_repetitive_phrases(text)
        # Should only keep one version
        sentences = [s.strip() for s in result.split(".") if s.strip()]
        assert len(sentences) == 1

    def test_preserve_order(self) -> None:
        text = "First sentence. Second sentence. First sentence. Third sentence."
        result = compress_repetitive_phrases(text)
        sentences = [s.strip() for s in result.split(".") if s.strip()]
        assert sentences[0] == "First sentence"
        assert sentences[1] == "Second sentence"
        assert sentences[2] == "Third sentence"

    def test_empty_text(self) -> None:
        assert compress_repetitive_phrases("") == ""

    def test_no_duplicates(self) -> None:
        text = "First sentence. Second sentence. Third sentence."
        result = compress_repetitive_phrases(text)
        assert result == text


class TestCompressWhitespace:
    def test_compress_multiple_spaces(self) -> None:
        text = "This   has    multiple     spaces"
        result = compress_whitespace(text)
        assert result == "This has multiple spaces"

    def test_compress_excessive_newlines(self) -> None:
        text = "Line 1\n\n\n\nLine 2\n\n\n\n\nLine 3"
        result = compress_whitespace(text)
        assert "\n\n\n" not in result
        # Should have at most 2 consecutive newlines
        import re

        assert not re.search(r"\n{3,}", result)

    def test_fix_double_periods(self) -> None:
        text = "This sentence ends.. Another sentence starts."
        result = compress_whitespace(text)
        assert ".." not in result
        assert result == "This sentence ends. Another sentence starts."

    def test_fix_double_commas(self) -> None:
        text = "Items: first,, second,, third"
        result = compress_whitespace(text)
        assert ",," not in result
        assert result == "Items: first, second, third"

    def test_strip_whitespace(self) -> None:
        text = "   Text with leading and trailing spaces   "
        result = compress_whitespace(text)
        assert result == "Text with leading and trailing spaces"

    def test_empty_text(self) -> None:
        assert compress_whitespace("") == ""
        assert compress_whitespace("   ") == ""


class TestCompressPromptText:
    def test_basic_compression(self) -> None:
        text = "The research methodology will comprehensively address various aspects. The research methodology will comprehensively address various aspects."
        result = compress_prompt_text(text, aggressive=False)
        # Should remove duplicates and compress whitespace
        assert len(result) < len(text)
        sentences = [s.strip() for s in result.split(".") if s.strip()]
        unique_sentences = {s.lower() for s in sentences}
        assert len(unique_sentences) == len(sentences)

    def test_aggressive_compression_short_text(self) -> None:
        # Text under 1000 words should not have stop words removed even with aggressive=True
        text = "The research methodology will address various aspects of the study."
        result = compress_prompt_text(text, aggressive=True)
        # Stop word removal should not be applied for short texts
        assert "the" in result.lower()

    def test_aggressive_compression_long_text(self) -> None:
        # Create text over 1000 words
        text = " ".join(["The research methodology will comprehensively address various aspects."] * 100)
        result = compress_prompt_text(text, aggressive=True)
        # Should apply stop word removal for long texts
        assert len(result) < len(text)
        # Stop words should be mostly removed
        word_count_ratio = len(result.split()) / len(text.split())
        assert word_count_ratio < 0.8  # Should reduce word count significantly

    def test_compression_preserves_meaning(self) -> None:
        text = "This innovative research approach will utilize novel methodologies to comprehensively investigate protein interactions."
        result = compress_prompt_text(text, aggressive=True)
        # Should preserve key scientific terms
        assert "innovative" in result or "research" in result
        assert "protein" in result
        assert "interactions" in result

    def test_empty_text(self) -> None:
        assert compress_prompt_text("") == ""
        assert compress_prompt_text("   ") == ""

    def test_logging_reduction_calculation(self) -> None:
        text = "This is a sample text for testing compression ratios."
        result = compress_prompt_text(text, aggressive=False)
        # Should successfully compress without errors
        assert isinstance(result, str)
        assert len(result) <= len(text)


class TestEstimateCompressionRatio:
    def test_high_repetition_text(self) -> None:
        text = "test test test test test test"
        ratio = estimate_compression_ratio(text)
        # High repetition should have low ratio (more compressible)
        assert ratio < 0.5

    def test_unique_words_text(self) -> None:
        text = "research methodology analysis investigation evaluation assessment"
        ratio = estimate_compression_ratio(text)
        # Unique words should have higher ratio (less compressible)
        assert ratio > 0.8

    def test_empty_text(self) -> None:
        assert estimate_compression_ratio("") == 1.0

    def test_minimum_ratio_cap(self) -> None:
        text = "a a a a a a a a a a"  # Very high repetition
        ratio = estimate_compression_ratio(text)
        # Should not go below 30%
        assert ratio >= 0.3


class TestIntegrationScenarios:
    def test_grant_application_content(self) -> None:
        """Test compression on realistic grant application text"""
        text = """
        This comprehensive research methodology will systematically address various aspects
        of protein folding mechanisms. The innovative approach utilizes novel techniques to
        investigate molecular interactions. Furthermore, the methodology encompasses
        multiple experimental approaches. Additionally, the comprehensive framework
        addresses various research challenges. The research methodology will systematically
        address various aspects of protein folding mechanisms.
        """

        result = compress_prompt_text(text, aggressive=True)

        # Should preserve key scientific content
        assert "protein" in result
        assert "folding" in result
        assert "molecular" in result
        assert "experimental" in result

        # Should be significantly shorter
        assert len(result) < len(text) * 0.8

        # Should remove duplicates
        assert result.count("protein folding mechanisms") <= 1

    def test_technical_specifications_preservation(self) -> None:
        """Test that technical specs and numbers are preserved"""
        text = """
        The study design involves 500 participants across 12 sites. Statistical analysis
        will utilize SPSS version 28.0 with alpha=0.05. The methodology includes RT-PCR
        amplification using primers specific for exon 3-4 junction. Data collection spans
        24 months with interim analysis at month 12.
        """

        result = compress_prompt_text(text, aggressive=True)

        # Numbers and technical terms should be preserved
        assert "500" in result
        assert "12" in result
        assert "28.0" in result
        assert "0.05" in result
        assert "RT-PCR" in result or ("RT" in result and "PCR" in result)
        assert "24" in result

    def test_scientific_terminology_preservation(self) -> None:
        """Test preservation of domain-specific terminology"""
        text = """
        CRISPR-Cas9 genome editing technology enables precise modification of DNA sequences.
        The methodology involves guide RNA design targeting specific genomic loci.
        Electroporation parameters include 1200V, 20ms pulse duration, with 2x10^6 cells.
        """

        result = compress_prompt_text(text, aggressive=True)

        # Scientific terms should be preserved
        assert "CRISPR-Cas9" in result
        assert "genome" in result or "genomic" in result
        assert "RNA" in result
        assert "1200V" in result
        assert "20ms" in result
        assert "2x10^6" in result

    def test_compression_performance_large_text(self) -> None:
        """Test performance on large text blocks"""
        # Create a large text block
        base_text = """
        The comprehensive research methodology systematically addresses various aspects
        of molecular biology research. This innovative approach utilizes multiple
        experimental techniques to investigate cellular mechanisms.
        """
        large_text = base_text * 50  # ~500+ words

        result = compress_prompt_text(large_text, aggressive=True)

        # Should achieve significant compression
        compression_ratio = len(result) / len(large_text)
        assert compression_ratio < 0.7

        # Should still contain key terms
        assert "molecular" in result
        assert "biology" in result
        assert "cellular" in result
