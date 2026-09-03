"""
QRコード画像を再生成するスクリプト。

items.json (データリポジトリ側) を読み込み、requires_qr が true の品目ごとに、
「持ち出し登録フォーム(checkout.html)」を直接開くQRコードPNGを
assets/qrcodes/{品目ID}.png として生成します。

使い方:
  1. 下の BASE_URL を、実際に公開したGitHub PagesのURLに書き換える
     (例: "https://masuda2304.github.io/fiteasy-nishiurawa-inventory-form")
  2. items.json のパスを ITEMS_JSON_PATH に指定する
     (データリポジトリを隣のフォルダにcloneしていればデフォルトのままでOK)
  3. 依存ライブラリをインストール: pip install qrcode[pil]
  4. 実行: python generate_qr_codes.py
  5. 生成された assets/qrcodes/*.png をこのリポジトリにコミット・pushする

品目を追加/変更/削除したときは、このスクリプトを再実行してください。
"""
import json
import os

BASE_URL = "https://YOUR-GITHUB-USERNAME.github.io/fiteasy-nishiurawa-inventory-form"
ITEMS_JSON_PATH = os.path.join(
    "..", "fiteasy-nishiurawa-inventory-data", "data", "items.json"
)
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "qrcodes")


def main():
    try:
        import qrcode
    except ImportError:
        raise SystemExit(
            "qrcodeライブラリが見つかりません。先に `pip install qrcode[pil]` を実行してください。"
        )

    if not os.path.exists(ITEMS_JSON_PATH):
        raise SystemExit(
            f"items.json が見つかりません: {ITEMS_JSON_PATH}\n"
            "ITEMS_JSON_PATH を実際のパスに書き換えるか、データリポジトリを"
            "このリポジトリの隣のフォルダにcloneしてください。"
        )

    with open(ITEMS_JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    count = 0
    for item in data["items"]:
        if not item.get("requires_qr"):
            continue
        url = f"{BASE_URL}/checkout.html?item={item['id']}"
        img = qrcode.make(url, box_size=8, border=2)
        out_path = os.path.join(OUTPUT_DIR, f"{item['id']}.png")
        img.save(out_path)
        print(f"生成: {out_path}  <-  {url}")
        count += 1

    print(f"\n完了: {count}件のQRコードを {OUTPUT_DIR} に生成しました。")
    if "YOUR-GITHUB-USERNAME" in BASE_URL:
        print(
            "\n[注意] BASE_URL がまだ書き換えられていません(YOUR-GITHUB-USERNAMEのまま)。"
            "実際のPages URLに書き換えて再実行してください。"
        )


if __name__ == "__main__":
    main()
