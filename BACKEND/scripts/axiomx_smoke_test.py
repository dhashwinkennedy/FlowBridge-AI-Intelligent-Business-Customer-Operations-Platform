#!/usr/bin/env python3
"""
AxiomX Pre-Development Integration Smoke Test
=============================================
This isolated script verifies connectivity, authentication, and core operations
for all configured backend technologies before full development begins:
1. MongoDB Atlas (Ping, Read/Write/Delete in integration_tests)
2. Pinecone (Index readiness, Integrated Embedding upsert, Semantic Retrieval, and Cleanup)
3. OpenRouter API (Minimal prompt generation and error diagnosis)
4. SMTP (Conditional connection & authentication check, no email sent)

Usage:
    python scripts/axiomx_smoke_test.py
"""

import os
import sys
import time
import warnings
from pathlib import Path
from typing import Any, Dict

# Suppress pyOpenSSL / cryptography RFC 5280 deprecation warnings on newer Python versions
warnings.filterwarnings("ignore")

try:
    from dotenv import dotenv_values
except ImportError:
    print("[ERROR] python-dotenv is required. Install via: pip install python-dotenv")
    sys.exit(1)


class Colors:
    """ANSI color codes for terminal formatting."""
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BOLD = '\033[1m'
    RESET = '\033[0m'


def log_step(title: str):
    print(f"\n{Colors.BOLD}{Colors.CYAN}--- {title} ---{Colors.RESET}")


def log_success(message: str):
    print(f"  {Colors.GREEN}[PASS]{Colors.RESET} {message}")


def log_warning(message: str):
    print(f"  {Colors.YELLOW}[WARN]{Colors.RESET} {message}")


def log_failure(message: str):
    print(f"  {Colors.RED}[FAIL]{Colors.RESET} {message}")


def log_info(message: str):
    print(f"  {Colors.BLUE}[INFO]{Colors.RESET} {message}")


# ----------------------------------------------------------------------
# 1. Configuration Loader
# ----------------------------------------------------------------------
def load_environment() -> Dict[str, str]:
    """Load configuration from .env without printing or leaking secrets."""
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if not env_path.exists():
        # Fallback to current directory
        env_path = Path(".env")
    if not env_path.exists():
        log_failure(f".env file not found at {env_path}")
        sys.exit(1)

    values = dotenv_values(env_path)
    # Merge with os.environ as fallback
    merged: Dict[str, str] = {}
    for k, v in values.items():
        if k and v is not None:
            merged[k.strip()] = v.strip()
    return merged


# ----------------------------------------------------------------------
# 2. Test 1: MongoDB Atlas Connectivity & CRUD
# ----------------------------------------------------------------------
def run_test_mongodb(env: Dict[str, str]) -> Dict[str, Any]:
    log_step("Test 1: MongoDB Atlas Connectivity & CRUD")
    result = {"service": "MongoDB Atlas", "test": "Connection and read/write", "status": "Fail", "details": ""}

    uri = env.get("MONGODB_URI")
    db_name = env.get("MONGODB_DATABASE", "axiomx")

    if not uri:
        result["details"] = "MONGODB_URI is missing in .env"
        log_failure(result["details"])
        return result

    try:
        import pymongo
        from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
    except ImportError:
        result["details"] = "pymongo package is not installed."
        log_failure(result["details"])
        return result

    client = None
    test_id = f"smoke_test_doc_{int(time.time())}"
    try:
        log_info(f"Connecting to MongoDB Atlas (timeout=5s)... Target DB: {db_name}")
        client = pymongo.MongoClient(uri, serverSelectionTimeoutMS=5000)

        # 1. Ping test
        ping_res = client.admin.command("ping")
        if ping_res.get("ok") != 1:
            raise ConnectionFailure(f"Ping returned unexpected status: {ping_res}")
        log_success("MongoDB ping command succeeded.")

        # 2. Verify database accessibility
        db = client[db_name]
        collection = db["integration_tests"]
        log_success(f"Accessed database: '{db_name}', target collection: 'integration_tests'.")

        # 3. Create temporary test document
        test_payload = {
            "_id": test_id,
            "test_run": "axiomx_pre_dev_smoke_test",
            "timestamp": time.time(),
            "status": "temporary_smoke_test_record",
        }
        insert_res = collection.insert_one(test_payload)
        if not insert_res.acknowledged:
            raise RuntimeError("Document insertion was not acknowledged.")
        log_success(f"Temporary test document written (ID: {test_id}).")

        # 4. Read back test document
        retrieved = collection.find_one({"_id": test_id})
        if not retrieved:
            raise RuntimeError("Inserted test document could not be retrieved.")

        # 5. Verify retrieved data
        if retrieved.get("test_run") != test_payload["test_run"]:
            raise ValueError(f"Data mismatch: expected '{test_payload['test_run']}', got '{retrieved.get('test_run')}'")
        log_success("Retrieved test document and verified all fields match.")

        # 6. Delete temporary test document
        del_res = collection.delete_one({"_id": test_id})
        if del_res.deleted_count != 1:
            log_warning("Document cleanup delete count was 0.")
        else:
            log_success(f"Temporary test document deleted successfully (ID: {test_id}).")

        result["status"] = "Pass"
        result["details"] = f"Ping OK, write, read & delete verified on DB '{db_name}'."
    except ServerSelectionTimeoutError as e:
        result["details"] = f"Server selection timeout (network or IP whitelist issue): {e}"
        log_failure(result["details"])
    except ConnectionFailure as e:
        result["details"] = f"Connection failure: {e}"
        log_failure(result["details"])
    except Exception as e:
        result["details"] = f"Unexpected error: {type(e).__name__} - {e}"
        log_failure(result["details"])
    finally:
        if client is not None:
            # Ensure cleanup if failed before delete
            try:
                client[db_name]["integration_tests"].delete_one({"_id": test_id})
            except Exception:
                pass
            client.close()

    return result


# ----------------------------------------------------------------------
# 3. Test 2: Pinecone Integrated Embedding & Semantic Retrieval
# ----------------------------------------------------------------------
def run_test_pinecone(env: Dict[str, str]) -> Dict[str, Dict[str, Any]]:
    log_step("Test 2: Pinecone Integrated Embedding & Semantic Retrieval")

    res_connection = {
        "service": "Pinecone",
        "test": "Index connection and readiness",
        "status": "Fail",
        "details": "",
    }
    res_insertion = {
        "service": "Pinecone",
        "test": "Integrated embedding insertion",
        "status": "Fail",
        "details": "",
    }
    res_retrieval = {
        "service": "Pinecone",
        "test": "Semantic retrieval",
        "status": "Fail",
        "details": "",
    }

    api_key = env.get("PINECONE_API_KEY")
    index_name = env.get("PINECONE_INDEX_NAME", "axiomx-knowledge")
    namespace = "company_axiomx_smoke_test"
    test_doc_id = f"smoke_test_warranty_{int(time.time())}"

    if not api_key:
        msg = "PINECONE_API_KEY is missing in .env"
        res_connection["details"] = msg
        res_insertion["details"] = msg
        res_retrieval["details"] = msg
        log_failure(msg)
        return {"connection": res_connection, "insertion": res_insertion, "retrieval": res_retrieval}

    try:
        from pinecone import Pinecone, EmbedQuery
    except ImportError:
        msg = "pinecone SDK is not installed."
        res_connection["details"] = msg
        res_insertion["details"] = msg
        res_retrieval["details"] = msg
        log_failure(msg)
        return {"connection": res_connection, "insertion": res_insertion, "retrieval": res_retrieval}

    pc = None
    index = None

    try:
        # Step A: Connect & Verify Readiness
        log_info(f"Connecting to Pinecone and inspecting index '{index_name}'...")
        pc = Pinecone(api_key=api_key)
        desc = pc.describe_index(index_name)

        status_dict = desc.status if isinstance(desc.status, dict) else getattr(desc.status, "to_dict", lambda: {})()
        is_ready = status_dict.get("ready", False) if isinstance(status_dict, dict) else (desc.status == "Ready")

        if not is_ready:
            res_connection["details"] = f"Index '{index_name}' status is not ready: {desc.status}"
            log_failure(res_connection["details"])
            return {"connection": res_connection, "insertion": res_insertion, "retrieval": res_retrieval}

        log_success(f"Connected to Pinecone. Index '{index_name}' is Ready.")
        res_connection["status"] = "Pass"
        res_connection["details"] = f"Index '{index_name}' ready. Model: {desc.schema.get('fields', {}).get('chunk_text', {}).get('embed', {}).get('model', 'integrated') if hasattr(desc, 'schema') and isinstance(desc.schema, dict) else 'llama-text-embed-v2'}"

        index = pc.Index(name=index_name)

        # Step B: Integrated Embedding Insertion
        sample_title = "AxiomX Integration Test Warranty Policy"
        sample_text = (
            "Our sample product comes with a one-year warranty from the date of purchase. "
            "Customers must provide valid proof of purchase when submitting a warranty claim."
        )

        sample_document = {
            "_id": test_doc_id,
            "title": sample_title,
            "chunk_text": sample_text,
            "company_id": "axiomx_smoke_test_company",
            "knowledge_type": "customer",
            "document_id": "smoke_doc_warranty_001",
            "source_filename": "warranty_policy_sample.txt",
            "chunk_index": 0,
        }

        log_info(f"Upserting test document into namespace '{namespace}' via Documents API...")
        upsert_res = index.documents.upsert(
            namespace=namespace,
            documents=[sample_document],
        )

        upserted_count = getattr(upsert_res, "upserted_count", 0)
        embed_tokens = 0
        if hasattr(upsert_res, "usage") and upsert_res.usage is not None:
            embed_tokens = getattr(upsert_res.usage, "embed_total_tokens", 0)

        if upserted_count < 1:
            raise RuntimeError(f"Upsert returned 0 documents accepted: {upsert_res}")

        log_success(f"Document upserted successfully (Accepted count: {upserted_count}, Embedded tokens: {embed_tokens}).")
        res_insertion["status"] = "Pass"
        res_insertion["details"] = f"Upserted 1 doc with integrated embedding ({embed_tokens} tokens embedded)."

        # Step C: Semantic Retrieval Test
        search_query = "How long is the product warranty?"
        log_info(f"Performing semantic retrieval for query: '{search_query}'...")

        # Pinecone applies index updates asynchronously, poll up to 15 seconds
        max_attempts = 8
        found_match = None
        for attempt in range(1, max_attempts + 1):
            log_info(f"Polling index for search visibility (attempt {attempt}/{max_attempts})...")
            search_res = index.documents.search(
                namespace=namespace,
                top_k=5,
                score_by=[EmbedQuery(field="chunk_text", query=search_query)],
                include_fields=["*"],
            )

            matches = getattr(search_res, "matches", [])
            for m in matches:
                doc_id = getattr(m, "id", None) or getattr(m, "_id", None)
                if doc_id == test_doc_id:
                    found_match = m
                    break

            if found_match is not None:
                break
            time.sleep(2)

        if found_match is None:
            raise RuntimeError(f"Semantic search did not return test document '{test_doc_id}' within {max_attempts*2}s.")

        retrieved_id = getattr(found_match, "id", None) or getattr(found_match, "_id", None)
        retrieved_text = getattr(found_match, "chunk_text", "")
        retrieved_score = getattr(found_match, "score", 0.0)
        retrieved_company = getattr(found_match, "company_id", None)
        retrieved_ktype = getattr(found_match, "knowledge_type", None)

        # Verification checks
        if "one-year warranty" not in retrieved_text.lower():
            raise ValueError(f"Retrieved text does not contain expected warranty information: {retrieved_text}")

        if retrieved_company != "axiomx_smoke_test_company" or retrieved_ktype != "customer":
            raise ValueError(f"Metadata preservation check failed: company_id={retrieved_company}, knowledge_type={retrieved_ktype}")

        log_success(f"Semantic retrieval verified! Match ID: '{retrieved_id}', Score: {retrieved_score:.4f}")
        log_success(f"Retrieved Text: \"{retrieved_text[:75]}...\"")
        log_success(f"Verified Metadata: company_id='{retrieved_company}', knowledge_type='{retrieved_ktype}'")

        res_retrieval["status"] = "Pass"
        res_retrieval["details"] = f"Retrieved matching document (Score: {retrieved_score:.4f}) with correct warranty policy text."

    except Exception as e:
        err_msg = f"{type(e).__name__}: {e}"
        log_failure(f"Pinecone operation failed: {err_msg}")
        if res_connection["status"] != "Pass":
            res_connection["details"] = err_msg
        elif res_insertion["status"] != "Pass":
            res_insertion["details"] = err_msg
        else:
            res_retrieval["details"] = err_msg
    finally:
        # Step D: Safe Cleanup
        if index is not None and test_doc_id:
            try:
                log_info(f"Cleaning up temporary test document '{test_doc_id}' from namespace '{namespace}'...")
                del_res = index.documents.delete(namespace=namespace, ids=[test_doc_id])
                log_success("Temporary test document deleted from Pinecone.")
            except Exception as clean_err:
                log_warning(f"Cleanup encountered error: {clean_err}")

    return {"connection": res_connection, "insertion": res_insertion, "retrieval": res_retrieval}


# ----------------------------------------------------------------------
# 4. Test 3: OpenRouter API Connectivity & LLM Generation
# ----------------------------------------------------------------------
def run_test_openrouter(env: Dict[str, str]) -> Dict[str, Any]:
    log_step("Test 3: OpenRouter Connectivity & LLM Generation")
    result = {
        "service": "OpenRouter",
        "test": "LLM response generation",
        "status": "Fail",
        "details": "",
    }

    api_key = env.get("OPENROUTER_API_KEY")
    base_url = env.get("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1").rstrip("/")
    model = env.get("OPENROUTER_MODEL", "openai/gpt-4o-mini")
    timeout_sec = float(env.get("OPENROUTER_TIMEOUT", 30))

    if not api_key:
        result["details"] = "OPENROUTER_API_KEY is missing in .env"
        log_failure(result["details"])
        return result

    try:
        import httpx
    except ImportError:
        result["details"] = "httpx is not installed."
        log_failure(result["details"])
        return result

    prompt = "Explain what a one-year product warranty means in one sentence."
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://axiomx.local",
        "X-Title": "AxiomX Integration Smoke Test",
    }
    payload = {
        "model": model,
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.2,
    }

    try:
        log_info(f"Sending minimal chat completion request to OpenRouter (Model: {model})...")
        with httpx.Client(timeout=timeout_sec) as client:
            response = client.post(f"{base_url}/chat/completions", headers=headers, json=payload)

        # Handle specific status codes
        if response.status_code == 401:
            result["details"] = "Authentication failed (401 Unauthorized). Verify OPENROUTER_API_KEY."
            log_failure(result["details"])
            return result
        elif response.status_code == 404:
            result["details"] = f"Model '{model}' not found or endpoint invalid (404 Not Found)."
            log_failure(result["details"])
            return result
        elif response.status_code == 429:
            result["details"] = "Rate limit exceeded or insufficient credits on OpenRouter account (429)."
            log_failure(result["details"])
            return result

        response.raise_for_status()
        data = response.json()

        choices = data.get("choices", [])
        if not choices:
            result["details"] = f"OpenRouter returned 200 OK but choices array is empty: {data}"
            log_failure(result["details"])
            return result

        content = choices[0].get("message", {}).get("content", "").strip()
        if not content:
            result["details"] = "OpenRouter response choice contained empty content."
            log_failure(result["details"])
            return result

        log_success(f"Received valid LLM response from model '{model}'.")
        log_info(f"Generated text: \"{content}\"")
        result["status"] = "Pass"
        result["details"] = f"Model '{model}' generated valid 1-sentence explanation."
    except httpx.TimeoutException:
        result["details"] = f"Request timed out after {timeout_sec}s connecting to {base_url}."
        log_failure(result["details"])
    except httpx.ConnectError as e:
        result["details"] = f"Network connection failed: {e}"
        log_failure(result["details"])
    except httpx.HTTPStatusError as e:
        result["details"] = f"HTTP error {e.response.status_code}: {e.response.text[:200]}"
        log_failure(result["details"])
    except Exception as e:
        result["details"] = f"Unexpected error: {type(e).__name__} - {e}"
        log_failure(result["details"])

    return result


# ----------------------------------------------------------------------
# 5. Test 4: SMTP Configuration (Optional)
# ----------------------------------------------------------------------
def run_test_smtp(env: Dict[str, str]) -> Dict[str, Any]:
    log_step("Test 4: SMTP Configuration (Optional)")
    result = {
        "service": "SMTP",
        "test": "Connection and authentication",
        "status": "Skipped",
        "details": "",
    }

    smtp_enabled_raw = env.get("SMTP_ENABLED", "false").lower()
    is_enabled = smtp_enabled_raw in ("true", "1", "yes")

    if not is_enabled:
        result["status"] = "Skipped"
        result["details"] = f"SMTP_ENABLED is set to '{smtp_enabled_raw}' in .env. Test skipped."
        log_info(result["details"])
        return result

    host = env.get("SMTP_HOST")
    port_str = env.get("SMTP_PORT", "587")
    username = env.get("SMTP_USERNAME")
    password = env.get("SMTP_PASSWORD")
    use_tls_raw = env.get("SMTP_USE_TLS", "true").lower()
    use_tls = use_tls_raw in ("true", "1", "yes")

    if not host or not username or not password:
        result["status"] = "Skipped"
        result["details"] = "SMTP is marked enabled but host, username, or password is missing."
        log_warning(result["details"])
        return result

    try:
        import smtplib
        port = int(port_str)
        log_info(f"Connecting to SMTP server {host}:{port} (TLS={use_tls})...")

        if port == 465 and not use_tls:
            server = smtplib.SMTP_SSL(host, port, timeout=10)
        else:
            server = smtplib.SMTP(host, port, timeout=10)

        server.ehlo()
        if use_tls:
            server.starttls()
            server.ehlo()

        log_info("Authenticating with SMTP server...")
        server.login(username, password)
        server.quit()

        log_success(f"SMTP connection and authentication succeeded on {host}:{port}.")
        result["status"] = "Pass"
        result["details"] = f"Authenticated successfully with {host}:{port}."
    except Exception as e:
        result["status"] = "Fail"
        result["details"] = f"SMTP authentication failed: {type(e).__name__} - {e}"
        log_failure(result["details"])

    return result


# ----------------------------------------------------------------------
# 6. Main Orchestrator & Report Generator
# ----------------------------------------------------------------------
def main():
    print(f"{Colors.BOLD}{Colors.HEADER}")
    print("=" * 65)
    print("      AXIOMX – PRE-DEVELOPMENT INTEGRATION SMOKE TEST")
    print("=" * 65)
    print(f"{Colors.RESET}")

    env = load_environment()
    log_info("Environment variables loaded securely from .env (secrets masked).")

    # Run tests independently
    t1_mongo = run_test_mongodb(env)
    t2_pinecone = run_test_pinecone(env)
    t3_openrouter = run_test_openrouter(env)
    t4_smtp = run_test_smtp(env)

    # Compile results
    results = [
        t1_mongo,
        t2_pinecone["connection"],
        t2_pinecone["insertion"],
        t2_pinecone["retrieval"],
        t3_openrouter,
        t4_smtp,
    ]

    # Print Summary Table
    print(f"\n{Colors.BOLD}{Colors.HEADER}")
    print("=" * 65)
    print("                    FINAL SMOKE TEST SUMMARY")
    print("=" * 65)
    print(f"{Colors.RESET}")

    print(f"| {'Service':<15} | {'Test':<32} | {'Result':<8} |")
    print(f"|{'-'*17}|{'-'*34}|{'-'*10}|")

    all_passed = True
    for r in results:
        status = r["status"]
        if status == "Pass":
            color = Colors.GREEN
        elif status == "Skipped":
            color = Colors.YELLOW
        else:
            color = Colors.RED
            all_passed = False
        print(f"| {r['service']:<15} | {r['test']:<32} | {color}{status:<8}{Colors.RESET} |")

    print("\n" + "=" * 65)
    if all_passed:
        print(f"{Colors.GREEN}{Colors.BOLD}ALL REQUIRED PRE-DEVELOPMENT INTEGRATION TESTS PASSED.{Colors.RESET}")
        print(f"{Colors.GREEN}The stack is verified and ready for full backend development.{Colors.RESET}")
    else:
        print(f"{Colors.RED}{Colors.BOLD}ONE OR MORE CRITICAL INTEGRATION TESTS FAILED.{Colors.RESET}")
        print(f"{Colors.RED}Please resolve the reported issues before proceeding.{Colors.RESET}")
    print("=" * 65 + "\n")

    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
