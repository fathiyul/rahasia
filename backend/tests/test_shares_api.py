from datetime import UTC, datetime, timedelta

from app.models.share import Share


def test_create_text_share(client) -> None:
    response = client.post(
        "/shares",
        json={
            "type": "text",
            "encrypted_payload": '{"iv":"iv","ciphertext":"cipher"}',
            "expires_in": 3600,
            "burn_after_read": False,
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert isinstance(data["id"], str)


def test_retrieve_text_share(client) -> None:
    create_response = client.post(
        "/shares",
        json={
            "type": "text",
            "encrypted_payload": '{"iv":"iv","ciphertext":"cipher"}',
            "expires_in": 3600,
            "burn_after_read": False,
        },
    )
    share_id = create_response.json()["id"]

    response = client.get(f"/shares/{share_id}")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == share_id
    assert data["type"] == "text"
    assert data["encrypted_payload"] == '{"iv":"iv","ciphertext":"cipher"}'


def test_expired_share_returns_410(client, db_session) -> None:
    create_response = client.post(
        "/shares",
        json={
            "type": "text",
            "encrypted_payload": '{"iv":"iv","ciphertext":"cipher"}',
            "expires_in": 1,
            "burn_after_read": False,
        },
    )
    share_id = create_response.json()["id"]

    share = db_session.get(Share, share_id)
    share.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    db_session.commit()

    response = client.get(f"/shares/{share_id}")

    assert response.status_code == 410
    assert response.json()["detail"] == "Share has expired"


def test_burn_after_read_share_is_consumed(client) -> None:
    create_response = client.post(
        "/shares",
        json={
            "type": "text",
            "encrypted_payload": '{"iv":"iv","ciphertext":"cipher"}',
            "expires_in": 3600,
            "burn_after_read": True,
        },
    )
    share_id = create_response.json()["id"]

    first_response = client.get(f"/shares/{share_id}")
    second_response = client.get(f"/shares/{share_id}")

    assert first_response.status_code == 200
    assert second_response.status_code == 410
    assert second_response.json()["detail"] == "Share has already been opened"


def test_file_share_requires_file_metadata(client) -> None:
    response = client.post(
        "/shares",
        json={
            "type": "file",
            "encrypted_payload": '{"iv":"iv","ciphertext":"cipher"}',
            "expires_in": 3600,
            "burn_after_read": False,
        },
    )

    assert response.status_code == 422
