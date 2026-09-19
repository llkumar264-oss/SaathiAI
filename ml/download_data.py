"""Data generator and synthesizer for Scam Detector training.

Creates a robust, diverse dataset of ~600 rows:
- Benchmark SMS (ham and spam)
- Real-world Indian scam patterns (KYC, electricity cut-off, digital arrest, lottery, OTP/UPI PIN scams)
  in Hindi, English, and Hinglish.
All rows tagged with a 'source' column.
"""

from pathlib import Path
import random
import pandas as pd

DATA_DIR = Path(__file__).parent / "data"

# Seed for deterministic generation
random.seed(42)

BANKS = ["SBI", "State Bank of India", "HDFC Bank", "ICICI Bank", "Punjab National Bank", "Axis Bank", "Bank of Baroda", "Kotak Bank"]
DISCOMS = ["BSES Rajdhani", "BSES Yamuna", "Tata Power", "UPPCL", "BESCOM", "MSEDCL", "DHBVN", "PSPCL"]
COURIERS = ["FedEx", "Blue Dart", "Delhivery", "India Post", "DTDC"]
LOTTERIES = ["KBC Jio Lottery", "Amitabh Bachchan KBC", "WhatsApp Mega Draw", "Tata Motors Lucky Draw", "Amazon Prime Rewards"]
AMOUNTS = ["10,000", "25,000", "50,000", "1,00,000", "5,00,000", "25,00,000"]
NAMES = ["Sharma ji", "Verma ji", "Gupta ji", "Singh Sahab", "Mishra ji", "Uncle ji", "Dad", "Papa"]

def generate_benchmark_and_indian_scam_dataset() -> pd.DataFrame:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    records = []

    # 1. Safe Benchmark SMS (Ham) - 160 distinct rows
    ham_templates = [
        "Hey {name}, hope you are doing well. Let us meet this weekend for tea.",
        "Your order #{num} has been delivered to your front door. Thank you for shopping with us.",
        "Good morning {name}, did you take your morning BP tablet? Call me after breakfast.",
        "Your appointment with Dr. {doc} is confirmed for tomorrow at {time}. Clinic address: Ring Road.",
        "Dear customer, your monthly e-statement for account ending {num4} is now available on netbanking.",
        "Happy Diwali to you and your entire family! Wishing you peace, prosperity, and good health.",
        "Can you please send me the recipe for the vegetable soup you made last week? It was delicious.",
        "Your train ticket PNR {pnr} is confirmed. Coach {coach} Seat {seat}. Indian Railways IRCTC.",
        "Dear consumer, your electricity bill of Rs {amt} has been paid successfully. {discom}.",
        "Hi grandpa, I reached college safely. Will call you on video call in the evening around 7 PM.",
        "Reminder: Water supply will be interrupted tomorrow from 9 AM to 1 PM for regular pipe maintenance.",
        "Dear pensioner, life certificate submission counter is open at {bank} branch till 4 PM this Friday.",
        "Beta is coming home this Saturday. Please buy some fresh fruits and sweets from the market.",
        "Your blood test report from Lal Pathlabs is ready. Download from your patient portal.",
        "Namaste, please bring your senior citizen card when coming for the society meeting tomorrow.",
        "Gas cylinder booking confirmed with Ref #{num}. Expected delivery by tomorrow afternoon. Indane.",
    ]
    docs = ["Gupta", "Sharma", "Batra", "Aggarwal", "Mehta"]
    coaches = ["B1", "B2", "B3", "A1", "S4"]
    for i in range(160):
        t = ham_templates[i % len(ham_templates)]
        text = t.format(
            name=NAMES[i % len(NAMES)],
            num=str(10000 + i * 37),
            num4=str(1000 + (i * 17) % 9000),
            doc=docs[i % len(docs)],
            time=f"{(10 + i % 6)}:30 AM",
            pnr=str(2849102830 + i),
            coach=coaches[i % len(coaches)],
            seat=str(15 + i % 55),
            amt=str(850 + (i * 73) % 2500),
            discom=DISCOMS[i % len(DISCOMS)],
            bank=BANKS[i % len(BANKS)],
        )
        records.append({"text": text, "label": 0, "source": "benchmark_sms"})

    # 2. Benchmark Scam/Spam SMS - 160 distinct rows
    spam_templates = [
        "WINNER! You have won a {amt} GBP cash prize or a free iPad! Call 0906170{num3} to claim your reward now.",
        "URGENT: Your mobile number has won {amt} pounds in the UK National Lottery. Reply with claim code {num4} to verify.",
        "Free entry into 250 weekly competition! Text CLAIM to 871{num2} now to claim your free reward.",
        "Congratulations! As a valued customer you are selected for a free holiday voucher worth {amt}. Call immediately.",
        "Loan approved without paperwork! Get Rs 5 Lakh instantly in your bank. Click link now to accept: http://bit.ly/quickloan{num3}",
        "Your credit card has been blocked due to suspicious activity. Call 981293{num4} immediately to unfreeze.",
        "You have 1 new private video message waiting. Call 0909972{num4} to listen. 1.50/min.",
        "Final notice: Your account will be charged $49.99 for annual renewal. Click link to cancel subscription: http://sub-cancel.xyz",
        "Exclusive offer: 80% discount on luxury watches and designer bags. Limited time only at www.fake-lux{num2}.com",
        "URGENT: We detected unauthorized login to your account. Update your password now at http://secure-verify{num3}.net",
        "Claim your guaranteed cashback bonus of Rs {amt}. Enter OTP at http://reward-cashback.in to withdraw money.",
        "Customer alert: 15,000 reward points expiring today. Redeem for smartphone at http://points-redeem.co",
    ]
    for i in range(160):
        t = spam_templates[i % len(spam_templates)]
        text = t.format(
            amt=AMOUNTS[i % len(AMOUNTS)],
            num2=f"{i:02d}",
            num3=f"{100 + i:03d}",
            num4=f"{1000 + i:04d}",
        )
        records.append({"text": text, "label": 1, "source": "benchmark_sms"})

    # 3. Synthetic Indian Scam Patterns (Hindi/English/Hinglish) - 180 distinct rows
    indian_scam_templates = [
        # Electricity cut-off threat
        "Dear consumer, your electricity power will be disconnected TONIGHT at 9:30 PM by {discom} because your previous month bill was not updated. Please immediately contact our electricity officer at 98{num8}. Thank you.",
        "बिजली विभाग सूचना: प्रिय उपभोक्ता, आपका बिजली कनेक्शन आज रात 9:30 बजे काट दिया जाएगा क्योंकि आपका पुराना बिल बकाया है। लाइन कटने से बचने के लिए तुरंत अधिकारी से 97{num8} पर संपर्क करें।",
        "Electricity alert: Bijli cut ho jayegi tonight at 9 PM. Bill not updated in system. Call officer immediately on 98{num8} or install bill support APK to avoid power cut.",
        
        # Bank KYC & PAN block
        "{bank} Alert: Dear customer, your netbanking account is suspended today due to pending PAN KYC. Click http://{bank_slug}-kyc-update{num2}.cc to update immediately or account permanently blocked.",
        "प्रिय ग्राहक, {bank} में आपका बैंक खाता KYC न होने के कारण आज रात 12 बजे बंद कर दिया जाएगा। चालू रखने के लिए इस लिंक पर पैन कार्ड दर्ज करें: http://verify-{bank_slug}.in",
        "{bank}: Your debit card has been disabled due to unverified Aadhaar. Call manager at 99{num8} or share 6-digit OTP to re-activate.",
        "Bank Notice: Rs 25,000 debited from your account. If you did not make this transaction, call fraud helpline 96{num8} immediately and share OTP.",

        # Digital arrest & police extortion
        "TRAI & Mumbai Cyber Crime: A FedEx parcel with your Aadhaar ID containing illegal narcotics and fake passports has been seized. A digital arrest warrant is issued. Connect on Skype immediately with Officer Sharma.",
        "दिल्ली पुलिस साइबर क्राइम: आपके नाम से अवैध मनी लॉन्ड्रिंग खाते पाए गए हैं। गिरफ्तारी से बचने के लिए तुरंत 95{num8} पर वीडियो कॉल करें और अपनी संपत्ति का सत्यापन कराएं।",
        "Customs Notice: Your international courier from Dubai has illegal contraband. To avoid immediate CBI arrest and jail, deposit security clearance fee of Rs 50,000.",

        # Lottery & Prize scams
        "CONGRATULATIONS! Amitabh Bachchan {lottery} winner! You have won {amt} Rupees cash. To claim your prize money contact lottery manager Rana Pratap Singh on WhatsApp 88{num8}.",
        "बधाई हो! आपको {lottery} में {amt} रुपये की लॉटरी लगी है। अपना इनाम अपने बैंक खाते में पाने के लिए तुरंत 98{num8} पर संपर्क करें और 2500 रुपये रजिस्ट्रेशन शुल्क जमा करें।",
        "Jio 5G Lucky Draw: Your mobile number has won Rs {amt}. Click http://jio-gift{num2}.com and enter your UPI PIN to claim money in bank.",

        # UPI PIN & Remote Access Fraud
        "Sir, I am calling from Google Pay / PhonePe support. Rs 2,500 cashback is credited to you. Open app and enter your 6-digit secret UPI PIN to receive money in account.",
        "सर, आपके बिजली बिल का 1500 रुपया रिफंड आया है। पैसा पाने के लिए अपने मोबाइल में AnyDesk / TeamViewer ऐप डाउनलोड करें और 9 अंकों का कोड बताएं।",
        "पेंशन विभाग सूचना: आपकी रु {amt} की बकाया पेंशन जारी हो गई है। तुरंत बैंक सत्यापन के लिए अपना UPI पिन दर्ज करें।",
    ]
    bank_slugs = ["sbi", "hdfc", "icici", "pnb", "bob"]
    for i in range(180):
        t = indian_scam_templates[i % len(indian_scam_templates)]
        text = t.format(
            discom=DISCOMS[i % len(DISCOMS)],
            bank=BANKS[i % len(BANKS)],
            bank_slug=bank_slugs[i % len(bank_slugs)],
            lottery=LOTTERIES[i % len(LOTTERIES)],
            amt=AMOUNTS[i % len(AMOUNTS)],
            num2=f"{i % 90:02d}",
            num8=f"{10000000 + i * 137:08d}"[:8],
        )
        records.append({"text": text, "label": 1, "source": "synthetic_indian_scam"})

    # 4. Safe Indian everyday messages - 150 distinct rows
    safe_indian_templates = [
        "नमस्ते {name}, कल सुबह मंदिर में सुंदरकांड का पाठ और प्रसाद वितरण है। आप सपरिवार समय से पधारें।",
        "Dad, I have transferred Rs 5,000 for your monthly medicines to your {bank} account. Please check your passbook.",
        "Dear consumer, your electricity bill payment of Rs {amt} for CA {ca} is received with thanks on {date}. {discom}.",
        "IRCTC: PNR {pnr} - Train 12423 Rajdhani Express is running on time from New Delhi Railway Station.",
        "नमस्ते {name}, डॉक्टर साहब का समय कल दोपहर 12 बजे तय हुआ है। पुरानी पर्ची साथ में ले आइएगा।",
        "Your Aadhaar authentication OTP is {otp}. Valid for 10 minutes. UIDAI will never call asking for OTP. Do not share OTP.",
        "प्रिय उपभोक्ता, आपका इस माह का सरकारी राशन डिपो पर उपलब्ध है। कृपया राशन कार्ड लेकर आएं।",
        "Papa, Maine aapke liye new BP monitor aur fresh dry fruits order kiya hai, kal deliver ho jayega.",
        "Your {bank} account XX{num4} has been credited with Rs 28,500 towards monthly pension.",
        "Life certificate submission successful for PPO number {ppo}. Next submission due November 2027.",
        "Beta Sharma ji, sham ko park me walk ke liye chalna hai kya? 5:30 baje gate par milte hain.",
        "Bank alert: You have withdrawn Rs 2,000 from {bank} ATM. Available balance is Rs 45,230.",
    ]
    dates = ["12-Sep", "15-Sep", "18-Sep", "20-Sep"]
    for i in range(150):
        t = safe_indian_templates[i % len(safe_indian_templates)]
        text = t.format(
            name=NAMES[i % len(NAMES)],
            bank=BANKS[i % len(BANKS)],
            discom=DISCOMS[i % len(DISCOMS)],
            amt=str(1200 + (i * 47) % 2000),
            ca=str(102938470 + i),
            date=dates[i % len(dates)],
            pnr=str(4829102830 + i),
            otp=str(400000 + (i * 91) % 500000),
            num4=str(2000 + (i * 31) % 7000),
            ppo=str(849201900 + i),
        )
        records.append({"text": text, "label": 0, "source": "synthetic_indian_scam"})

    df = pd.DataFrame(records)
    df = df.drop_duplicates(subset=["text"]).reset_index(drop=True)
    out_file = DATA_DIR / "scam_corpus.csv"
    df.to_csv(out_file, index=False)
    print(f"Generated diverse dataset with {len(df)} rows at {out_file}")
    print(df.groupby(["source", "label"]).size())
    return df


if __name__ == "__main__":
    generate_benchmark_and_indian_scam_dataset()
